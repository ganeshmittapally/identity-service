import { Router } from 'express';
import EmailController from '../controllers/EmailController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Email Routes
 */

// Public routes (no auth required)
router.post('/request-password-reset', EmailController.requestPasswordReset);
router.post('/verify', EmailController.verifyEmail);
router.post('/confirm-change', EmailController.confirmEmailChange);

// Protected routes (auth required)
router.post('/resend-confirmation', authenticate, EmailController.resendConfirmation);
router.get('/preferences', authenticate, EmailController.getPreferences);
router.post('/preferences', authenticate, EmailController.updatePreferences);
router.post('/change-request', authenticate, EmailController.requestEmailChange);

export default router;
