import { redis } from '../config/redis';
import { database } from '../config/database';
import { logger } from '../config/logger';

/**
 * Health Check Service
 * Monitors system health and dependencies
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    memory: HealthStatus;
    uptime: HealthStatus;
  };
  summary: {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    timestamp: string;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message: string;
  timestamp: string;
}

export interface ServiceMetrics {
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    percentage: number;
  };
  requestsPerSecond: number;
  averageResponseTime: number;
}

/**
 * Health Check Service
 */
export class HealthCheckService {
  private readonly HEALTH_CHECK_PREFIX = 'health:';
  private readonly HEALTH_CHECK_CACHE_TTL = 10; // seconds
  private requestCount = 0;
  private lastResetTime = Date.now();

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      // Simple health check query
      await database.query('SELECT 1', []);
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        message: `Database responding in ${responseTime}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check failed', { error });
      return {
        status: 'unhealthy',
        responseTime,
        message: `Database unreachable: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis(): Promise<HealthStatus> {
    const startTime = Date.now();
    try {
      const pong = await redis.ping();
      const responseTime = Date.now() - startTime;

      if (pong === 'PONG') {
        return {
          status: responseTime < 500 ? 'healthy' : 'degraded',
          responseTime,
          message: `Redis responding in ${responseTime}ms`,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          message: 'Redis ping failed',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Redis health check failed', { error });
      return {
        status: 'unhealthy',
        responseTime,
        message: `Redis unreachable: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check memory usage
   */
  checkMemory(): HealthStatus {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (heapUsedPercent > 90) {
        status = 'unhealthy';
      } else if (heapUsedPercent > 75) {
        status = 'degraded';
      }

      return {
        status,
        responseTime: 0,
        message: `Memory usage: ${heapUsedPercent.toFixed(2)}% (${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB)`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Memory check failed', { error });
      return {
        status: 'degraded',
        responseTime: 0,
        message: `Memory check error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Check system uptime
   */
  checkUptime(): HealthStatus {
    try {
      const uptime = Math.floor(process.uptime());
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);

      // Unhealthy if restarted recently (less than 5 minutes)
      const status = uptime < 300 ? 'degraded' : 'healthy';

      return {
        status,
        responseTime: 0,
        message: `Uptime: ${days}d ${hours}h ${minutes}m (${uptime}s)`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Uptime check failed', { error });
      return {
        status: 'degraded',
        responseTime: 0,
        message: `Uptime check error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get overall health check result
   */
  async getOverallHealth(): Promise<HealthCheckResult> {
    const checkStartTime = Date.now();

    // Run all checks in parallel
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memoryHealth = this.checkMemory();
    const uptimeHealth = this.checkUptime();

    // Determine overall status
    const allStatuses = [dbHealth.status, redisHealth.status, memoryHealth.status, uptimeHealth.status];
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (allStatuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (allStatuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - checkStartTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth,
        redis: redisHealth,
        memory: memoryHealth,
        uptime: uptimeHealth,
      },
      summary: {
        overallStatus,
        responseTime,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(): ServiceMetrics {
    try {
      const uptime = Math.floor(process.uptime());
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      const now = Date.now();
      const timeSinceReset = (now - this.lastResetTime) / 1000;
      const requestsPerSecond = this.requestCount / (timeSinceReset || 1);

      return {
        uptime,
        memoryUsage: {
          heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024),
          external: Math.floor(memUsage.external / 1024 / 1024),
          percentage: Math.round(heapUsedPercent),
        },
        requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
        averageResponseTime: 0, // Would be fetched from MetricsService
      };
    } catch (error) {
      logger.error('Error getting service metrics', { error });
      return {
        uptime: 0,
        memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, percentage: 0 },
        requestsPerSecond: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Record request for metrics
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * Reset request counter
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.lastResetTime = Date.now();
  }

  /**
   * Get health check cached or fresh
   */
  async getHealthCheck(useCache: boolean = true): Promise<HealthCheckResult> {
    if (useCache) {
      const cached = await redis.get(`${this.HEALTH_CHECK_PREFIX}result`);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.getOverallHealth();

    // Cache the result
    await redis.setex(
      `${this.HEALTH_CHECK_PREFIX}result`,
      this.HEALTH_CHECK_CACHE_TTL,
      JSON.stringify(result)
    );

    return result;
  }

  /**
   * Get readiness status (detailed health for load balancers)
   */
  async getReadiness(): Promise<{ ready: boolean; details: HealthCheckResult }> {
    const health = await this.getOverallHealth();
    const ready = health.summary.overallStatus !== 'unhealthy';

    return {
      ready,
      details: health,
    };
  }

  /**
   * Get liveness status (simple up/down for orchestrators)
   */
  async getLiveness(): Promise<{ alive: boolean; uptime: number }> {
    try {
      // Simple check: can we reach Redis?
      const ping = await redis.ping();
      return {
        alive: ping === 'PONG',
        uptime: Math.floor(process.uptime()),
      };
    } catch {
      return {
        alive: false,
        uptime: Math.floor(process.uptime()),
      };
    }
  }
}

export const healthCheckService = new HealthCheckService();
