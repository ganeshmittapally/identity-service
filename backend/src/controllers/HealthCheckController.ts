import { Request, Response } from 'express';
import { healthCheckService } from '../services/HealthCheckService';
import { logger } from '../config/logger';

/**
 * Health Check Controller
 * Endpoints for system health monitoring
 */
export class HealthCheckController {
  /**
   * GET /health
   * Simple liveness probe (for orchestrators like Kubernetes)
   */
  async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      const liveness = await healthCheckService.getLiveness();

      if (liveness.alive) {
        res.json({
          status: 'alive',
          uptime: liveness.uptime,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'dead',
          uptime: liveness.uptime,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Liveness check failed', { error });
      res.status(503).json({
        status: 'error',
        error: 'Liveness check failed',
      });
    }
  }

  /**
   * GET /ready
   * Readiness probe (determines if service should receive traffic)
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const readiness = await healthCheckService.getReadiness();

      if (readiness.ready) {
        res.json({
          ready: true,
          details: readiness.details,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          ready: false,
          details: readiness.details,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({
        ready: false,
        error: 'Readiness check failed',
      });
    }
  }

  /**
   * GET /api/v1/health
   * Comprehensive health check (for monitoring dashboards)
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const useCache = req.query.cache !== 'false';
      const health = await healthCheckService.getHealthCheck(useCache);

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }

  /**
   * GET /api/v1/health/database
   * Check database health specifically
   */
  async getDatabaseHealth(req: Request, res: Response): Promise<void> {
    try {
      const dbHealth = await healthCheckService.checkDatabase();

      const statusCode = dbHealth.status === 'healthy' ? 200 : dbHealth.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: {
          service: 'database',
          ...dbHealth,
        },
      });
    } catch (error) {
      logger.error('Database health check failed', { error });
      res.status(500).json({
        success: false,
        error: 'Database health check failed',
      });
    }
  }

  /**
   * GET /api/v1/health/redis
   * Check Redis health specifically
   */
  async getRedisHealth(req: Request, res: Response): Promise<void> {
    try {
      const redisHealth = await healthCheckService.checkRedis();

      const statusCode = redisHealth.status === 'healthy' ? 200 : redisHealth.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: {
          service: 'redis',
          ...redisHealth,
        },
      });
    } catch (error) {
      logger.error('Redis health check failed', { error });
      res.status(500).json({
        success: false,
        error: 'Redis health check failed',
      });
    }
  }

  /**
   * GET /api/v1/health/metrics
   * Get service metrics (uptime, memory, requests/sec)
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = healthCheckService.getServiceMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Metrics retrieval failed', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics',
      });
    }
  }

  /**
   * GET /api/v1/health/status
   * Get combined status for load balancer health checks
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const health = await healthCheckService.getOverallHealth();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        checks: Object.entries(health.checks).reduce((acc: Record<string, string>, [key, val]) => {
          acc[key] = val.status;
          return acc;
        }, {}),
        responseTime: health.summary.responseTime,
        timestamp: health.timestamp,
      });
    } catch (error) {
      logger.error('Status check failed', { error });
      res.status(503).json({
        status: 'unhealthy',
        error: 'Status check failed',
      });
    }
  }
}

export const healthCheckController = new HealthCheckController();
