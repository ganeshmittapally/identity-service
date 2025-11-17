import { Router } from 'express';
import { healthCheckController } from '../controllers/HealthCheckController';

const router = Router();

// Public health check endpoints (no auth required for orchestrators)
router.get('/health', healthCheckController.getLiveness.bind(healthCheckController));
router.get('/ready', healthCheckController.getReadiness.bind(healthCheckController));

// Authenticated health check endpoints
router.get('/api/v1/health', healthCheckController.getHealth.bind(healthCheckController));
router.get('/api/v1/health/database', healthCheckController.getDatabaseHealth.bind(healthCheckController));
router.get('/api/v1/health/redis', healthCheckController.getRedisHealth.bind(healthCheckController));
router.get('/api/v1/health/metrics', healthCheckController.getMetrics.bind(healthCheckController));
router.get('/api/v1/health/status', healthCheckController.getStatus.bind(healthCheckController));

export default router;
