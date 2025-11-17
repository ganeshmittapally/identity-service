import { Router } from 'express';
import TwoFactorController from '../controllers/TwoFactorController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * Two-Factor Authentication Routes
 * All routes require authentication
 */

// Setup and disable
router.get('/setup', authenticate, TwoFactorController.initiateSetup);
router.post('/verify', authenticate, TwoFactorController.enableTwoFactor);
router.post('/disable', authenticate, TwoFactorController.disableTwoFactor);

// Status and backup codes
router.get('/status', authenticate, TwoFactorController.getStatus);
router.get('/backup-codes', authenticate, TwoFactorController.getBackupCodes);
router.post('/backup-codes/regenerate', authenticate, TwoFactorController.regenerateBackupCodes);

// Challenge system (login verification)
router.post('/challenge', TwoFactorController.createChallenge);
router.post('/verify-challenge', TwoFactorController.verifyChallengeWithOTP);

// Trusted devices
router.get('/trusted-devices', authenticate, TwoFactorController.getTrustedDevices);
router.delete('/trusted-devices/:deviceId', authenticate, TwoFactorController.removeTrustedDevice);
router.post('/trusted-devices/revoke-all', authenticate, TwoFactorController.revokeAllDeviceTrusts);

export default router;
