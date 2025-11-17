import { Router } from 'express';
import AnalyticsController from '../controllers/AnalyticsController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Analytics & Metrics Routes
 * All routes require authentication
 */

// Metrics endpoints
router.get('/metrics', authenticate, AnalyticsController.getMetrics);
router.get('/endpoints/:method/:endpoint', authenticate, AnalyticsController.getEndpointMetrics);

// Health and summary
router.get('/health', authenticate, AnalyticsController.getHealth);
router.get('/summary', authenticate, AnalyticsController.getSummary);

// Top data
router.get('/top-endpoints', authenticate, AnalyticsController.getTopEndpoints);
router.get('/errors', authenticate, AnalyticsController.getErrors);

// API info
router.get('/api-version', AnalyticsController.getVersionInfo); // Public endpoint
router.get('/performance', authenticate, AnalyticsController.getPerformance);

export default router;
