import { Request, Response } from 'express';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Metrics and Analytics Service
 * Collects and aggregates API metrics for monitoring and analytics
 */

export interface ApiMetric {
  timestamp: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  clientId?: string;
  errorType?: string;
}

export interface AggregatedMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{ endpoint: string; requests: number }>;
  topErrors: Array<{ error: string; count: number }>;
}

export interface MetricsSnapshot {
  timestamp: string;
  metrics: AggregatedMetrics;
  period: string;
}

/**
 * Metrics Service
 */
export class MetricsService {
  private readonly METRICS_PREFIX = 'metrics:';
  private readonly METRICS_EXPIRY = 86400; // 24 hours

  /**
   * Record API request metric
   */
  async recordMetric(metric: ApiMetric): Promise<void> {
    try {
      // Store individual metric
      const metricKey = `${this.METRICS_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await redis.setex(metricKey, this.METRICS_EXPIRY, JSON.stringify(metric));

      // Add to sorted set for time-based queries
      const timestamp = new Date(metric.timestamp).getTime();
      await redis.zadd(`${this.METRICS_PREFIX}all`, timestamp, metricKey);

      // Track endpoint metrics
      const endpointKey = `${this.METRICS_PREFIX}endpoint:${metric.method}:${metric.endpoint}`;
      await redis.incr(endpointKey);
      await redis.expire(endpointKey, this.METRICS_EXPIRY);

      // Track status code metrics
      const statusKey = `${this.METRICS_PREFIX}status:${metric.statusCode}`;
      await redis.incr(statusKey);
      await redis.expire(statusKey, this.METRICS_EXPIRY);

      // Track response time (for percentiles)
      const responseTimeKey = `${this.METRICS_PREFIX}response_times:${metric.method}:${metric.endpoint}`;
      await redis.lpush(responseTimeKey, metric.responseTime.toString());
      await redis.expire(responseTimeKey, this.METRICS_EXPIRY);

      // Track errors
      if (metric.statusCode >= 400) {
        const errorKey = `${this.METRICS_PREFIX}errors:${metric.errorType || 'unknown'}`;
        await redis.incr(errorKey);
        await redis.expire(errorKey, this.METRICS_EXPIRY);
      }

      logger.debug('Metric recorded', {
        endpoint: metric.endpoint,
        method: metric.method,
        statusCode: metric.statusCode,
        responseTime: metric.responseTime,
      });
    } catch (error) {
      logger.error('Failed to record metric', { error });
    }
  }

  /**
   * Get aggregated metrics for time period
   */
  async getMetrics(periodMinutes: number = 60): Promise<AggregatedMetrics | null> {
    try {
      const now = Date.now();
      const periodStart = now - periodMinutes * 60 * 1000;

      // Get all metrics in period
      const metricsKeys = await redis.zrangebyscore(
        `${this.METRICS_PREFIX}all`,
        periodStart,
        now
      );

      if (metricsKeys.length === 0) {
        return this.getEmptyMetrics();
      }

      const metrics: ApiMetric[] = [];
      for (const key of metricsKeys) {
        const data = await redis.get(key);
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }

      return this.aggregateMetrics(metrics);
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      return null;
    }
  }

  /**
   * Get metrics for specific endpoint
   */
  async getEndpointMetrics(method: string, endpoint: string): Promise<Record<string, any> | null> {
    try {
      const key = `${this.METRICS_PREFIX}endpoint:${method}:${endpoint}`;
      const count = await redis.get(key);

      if (!count) {
        return null;
      }

      const responseTimeKey = `${this.METRICS_PREFIX}response_times:${method}:${endpoint}`;
      const responseTimes = await redis.lrange(responseTimeKey, 0, -1);

      const times = responseTimes.map(t => parseInt(t, 10));
      const sorted = times.sort((a, b) => a - b);

      return {
        method,
        endpoint,
        requestCount: parseInt(count, 10),
        averageResponseTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b) / times.length) : 0,
        minResponseTime: sorted.length > 0 ? sorted[0] : 0,
        maxResponseTime: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
        p50ResponseTime: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.5)] : 0,
        p95ResponseTime: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
        p99ResponseTime: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
      };
    } catch (error) {
      logger.error('Failed to get endpoint metrics', { error });
      return null;
    }
  }

  /**
   * Get health metrics
   */
  async getHealthMetrics(): Promise<Record<string, any>> {
    try {
      const metrics = await this.getMetrics(5); // Last 5 minutes

      if (!metrics) {
        return {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          metrics: this.getEmptyMetrics(),
        };
      }

      const status =
        metrics.errorRate > 0.1 ? 'degraded' :
        metrics.errorRate > 0.05 ? 'warning' :
        'healthy';

      return {
        status,
        timestamp: new Date().toISOString(),
        metrics,
      };
    } catch (error) {
      logger.error('Failed to get health metrics', { error });
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve metrics',
      };
    }
  }

  /**
   * Aggregate metrics
   */
  private aggregateMetrics(metrics: ApiMetric[]): AggregatedMetrics {
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;

    // Calculate response time stats
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length)
      : 0;

    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime = responseTimes[p95Index] || 0;
    const p99ResponseTime = responseTimes[p99Index] || 0;

    // Top endpoints
    const endpointCounts = new Map<string, number>();
    metrics.forEach(m => {
      const key = `${m.method} ${m.endpoint}`;
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
    });

    const topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([endpoint, requests]) => ({ endpoint, requests }));

    // Top errors
    const errorCounts = new Map<string, number>();
    metrics
      .filter(m => m.statusCode >= 400)
      .forEach(m => {
        const errorType = m.errorType || `HTTP ${m.statusCode}`;
        errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
      });

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate: Math.round(errorRate * 100) / 100,
      topEndpoints,
      topErrors,
    };
  }

  /**
   * Get empty metrics
   */
  private getEmptyMetrics(): AggregatedMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      topEndpoints: [],
      topErrors: [],
    };
  }

  /**
   * Clear old metrics
   */
  async clearOldMetrics(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
      const removed = await redis.zremrangebyscore(
        `${this.METRICS_PREFIX}all`,
        '-inf',
        cutoffTime
      );

      logger.info('Old metrics cleared', { removed, olderThanHours });
      return removed || 0;
    } catch (error) {
      logger.error('Failed to clear old metrics', { error });
      return 0;
    }
  }
}

/**
 * Metrics middleware
 */
export class MetricsMiddleware {
  private metricsService: MetricsService;

  constructor(metricsService: MetricsService = new MetricsService()) {
    this.metricsService = metricsService;
  }

  /**
   * Middleware to collect metrics
   */
  collectMetrics() {
    return (req: Request, res: Response, next: any): void => {
      const startTime = Date.now();
      const method = req.method;
      const endpoint = req.route?.path || req.path;
      const userId = (req as any).user?.id;
      const clientId = (req as any).client?.id;

      // Capture original send
      const originalSend = res.send;

      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Determine error type
        let errorType: string | undefined;
        if (statusCode >= 400 && data) {
          if (typeof data === 'string') {
            errorType = data.split('\n')[0].substring(0, 100);
          } else if (typeof data === 'object' && 'error' in data) {
            errorType = (data as any).error;
          }
        }

        // Record metric asynchronously
        this.metricsService.recordMetric({
          timestamp: new Date().toISOString(),
          endpoint,
          method,
          statusCode,
          responseTime,
          userId,
          clientId,
          errorType,
        }).catch(err => {
          logger.error('Failed to record metric', { err });
        });

        return originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Get metrics service
   */
  getMetricsService(): MetricsService {
    return this.metricsService;
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
export const metricsMiddleware = new MetricsMiddleware(metricsService);

export default metricsService;
