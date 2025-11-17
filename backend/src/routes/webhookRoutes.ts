import { Router } from 'express';
import WebhookController from '../controllers/WebhookController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Webhook Routes
 * All routes require authentication
 */

// Webhook management
router.post('/', authenticate, WebhookController.register);
router.get('/', authenticate, WebhookController.list);
router.get('/:webhookId', authenticate, WebhookController.get);
router.patch('/:webhookId', authenticate, WebhookController.update);
router.delete('/:webhookId', authenticate, WebhookController.delete);

// Event management
router.get('/:webhookId/events', authenticate, WebhookController.getEventHistory);
router.post('/:webhookId/events/:eventId/resend', authenticate, WebhookController.resendEvent);

// Testing
router.post('/test', authenticate, WebhookController.test);

export default router;
