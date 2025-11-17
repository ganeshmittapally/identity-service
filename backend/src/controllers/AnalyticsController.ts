import { Request, Response } from 'express';
import { metricsService } from '../services/MetricsService';
import { apiVersionService } from '../services/ApiVersionService';
import { logger } from '../config/logger';

/**
 * Analytics & Metrics Controller
 * Provides endpoints for viewing analytics and metrics data
 */

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/metrics
   * Get aggregated metrics for specified period
   */
  static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const period = parseInt(req.query.period as string) || 60; // Default 60 minutes

      if (period < 5 || period > 1440) {
        res.status(400).json({ error: 'Period must be between 5 and 1440 minutes' });
        return;
      }

      const metrics = await metricsService.getMetrics(period);

      if (!metrics) {
        res.status(500).json({ error: 'Failed to retrieve metrics' });
        return;
      }

      res.json({
        period,
        unit: 'minutes',
        metrics,
        timestamp: new Date().toISOString(),
      });

      logger.info('Metrics retrieved', { period });
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  }

  /**
   * GET /api/v1/analytics/endpoints/:method/:endpoint
   * Get metrics for specific endpoint
   */
  static async getEndpointMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { method, endpoint } = req.params;

      if (!method || !endpoint) {
        res.status(400).json({ error: 'Method and endpoint required' });
        return;
      }

      const metrics = await metricsService.getEndpointMetrics(method.toUpperCase(), `/${endpoint}`);

      if (!metrics) {
        res.status(404).json({ error: 'No metrics found for this endpoint' });
        return;
      }

      res.json(metrics);

      logger.info('Endpoint metrics retrieved', { method, endpoint });
    } catch (error) {
      logger.error('Failed to get endpoint metrics', { error });
      res.status(500).json({ error: 'Failed to retrieve endpoint metrics' });
    }
  }

  /**
   * GET /api/v1/analytics/health
   * Get system health based on recent metrics
   */
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await metricsService.getHealthMetrics();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500;

      res.status(statusCode).json(health);

      logger.info('Health metrics retrieved', { status: health.status });
    } catch (error) {
      logger.error('Failed to get health metrics', { error });
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve health metrics',
      });
    }
  }

  /**
   * GET /api/v1/analytics/summary
   * Get summary analytics dashboard
   */
  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      // Get metrics for different time periods
      const last5Min = await metricsService.getMetrics(5);
      const last1Hour = await metricsService.getMetrics(60);
      const last24Hours = await metricsService.getMetrics(1440);

      res.json({
        summary: {
          last5Minutes: last5Min,
          last1Hour: last1Hour,
          last24Hours: last24Hours,
        },
        timestamp: new Date().toISOString(),
        note: 'Use ?period=X to query specific time ranges in minutes',
      });

      logger.info('Analytics summary retrieved');
    } catch (error) {
      logger.error('Failed to get analytics summary', { error });
      res.status(500).json({ error: 'Failed to retrieve analytics summary' });
    }
  }

  /**
   * GET /api/v1/analytics/top-endpoints
   * Get top endpoints by request count
   */
  static async getTopEndpoints(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const metrics = await metricsService.getMetrics(60);

      if (!metrics || metrics.topEndpoints.length === 0) {
        res.json({ topEndpoints: [], limit });
        return;
      }

      res.json({
        topEndpoints: metrics.topEndpoints.slice(0, limit),
        limit,
        total: metrics.topEndpoints.length,
        timestamp: new Date().toISOString(),
      });

      logger.info('Top endpoints retrieved', { limit });
    } catch (error) {
      logger.error('Failed to get top endpoints', { error });
      res.status(500).json({ error: 'Failed to retrieve top endpoints' });
    }
  }

  /**
   * GET /api/v1/analytics/errors
   * Get error analytics
   */
  static async getErrors(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const metrics = await metricsService.getMetrics(60);

      if (!metrics || metrics.topErrors.length === 0) {
        res.json({
          topErrors: [],
          totalErrors: 0,
          errorRate: 0,
          limit,
        });
        return;
      }

      res.json({
        topErrors: metrics.topErrors.slice(0, limit),
        totalErrors: metrics.failedRequests,
        errorRate: metrics.errorRate,
        limit,
        total: metrics.topErrors.length,
        timestamp: new Date().toISOString(),
      });

      logger.info('Error analytics retrieved', { limit });
    } catch (error) {
      logger.error('Failed to get error analytics', { error });
      res.status(500).json({ error: 'Failed to retrieve error analytics' });
    }
  }

  /**
   * GET /api/v1/analytics/api-version
   * Get API version compatibility information
   */
  static async getVersionInfo(req: Request, res: Response): Promise<void> {
    try {
      const compatibility = apiVersionService.getCompatibility();

      res.json({
        apiVersion: compatibility,
        versions: {
          current: compatibility.currentVersion,
          supported: compatibility.supportedVersions,
          deprecated: compatibility.deprecatedVersions,
          sunset: compatibility.sunsetVersions,
        },
        timestamp: new Date().toISOString(),
        note: 'Use X-API-Version header or /api/v{version}/ prefix to specify version',
      });

      logger.info('API version info retrieved');
    } catch (error) {
      logger.error('Failed to get version info', { error });
      res.status(500).json({ error: 'Failed to retrieve version info' });
    }
  }

  /**
   * GET /api/v1/analytics/performance
   * Get performance metrics and SLA metrics
   */
  static async getPerformance(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getMetrics(60);

      if (!metrics) {
        res.status(500).json({ error: 'Failed to retrieve performance metrics' });
        return;
      }

      // Calculate SLA metrics
      const slaTargets = {
        availability: 99.9, // 99.9% uptime
        responseTime: 200, // 200ms average
        p95ResponseTime: 500, // 500ms p95
      };

      const slaActuals = {
        availability: ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2),
        responseTime: metrics.averageResponseTime,
        p95ResponseTime: metrics.p95ResponseTime,
      };

      const slaMet = {
        availability: parseFloat(slaActuals.availability as string) >= slaTargets.availability,
        responseTime: slaActuals.responseTime <= slaTargets.responseTime,
        p95ResponseTime: slaActuals.p95ResponseTime <= slaTargets.p95ResponseTime,
      };

      res.json({
        slaTargets,
        slaActuals,
        slaMet,
        metrics,
        timestamp: new Date().toISOString(),
      });

      logger.info('Performance metrics retrieved');
    } catch (error) {
      logger.error('Failed to get performance metrics', { error });
      res.status(500).json({ error: 'Failed to retrieve performance metrics' });
    }
  }
}

export default AnalyticsController;
