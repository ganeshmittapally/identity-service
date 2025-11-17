import { Request, Response } from 'express';
import { TwoFactorService, TwoFactorChallenge, TwoFactorTrustDevice } from '../services/TwoFactorService';
import { emailService } from '../services/EmailService';
import { logger } from '../config/logger';
import { validateInput } from '../utils/validation';

/**
 * Two-Factor Authentication Controller
 * Handles 2FA setup, verification, and management endpoints
 */

export class TwoFactorController {
  /**
   * GET /auth/2fa/setup
   * Initiate 2FA setup - generate secret and QR code
   */
  static async initiateSetup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if 2FA already enabled
      const isEnabled = await TwoFactorService.isTwoFactorEnabled(userId);
      if (isEnabled) {
        res.status(400).json({ error: '2FA is already enabled for this account' });
        return;
      }

      const email = req.user?.email;
      const { secret, qrCode } = await TwoFactorService.generateSecret(userId, email);

      res.json({
        secret,
        qrCode,
        message: 'Scan the QR code with your authenticator app',
      });

      logger.info('2FA setup initiated', { userId });
    } catch (error) {
      logger.error('Failed to initiate 2FA setup', { error });
      res.status(500).json({ error: 'Failed to initiate 2FA setup' });
    }
  }

  /**
   * POST /auth/2fa/verify
   * Verify OTP and enable 2FA
   */
  static async enableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { secret, token } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate input
      const validation = validateInput({
        secret: { value: secret, type: 'string', required: true },
        token: { value: token, type: 'string', required: true, pattern: /^\d{6}$/ },
      });

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }

      // Verify token
      const isValid = TwoFactorService.verifyToken(secret, token);
      if (!isValid) {
        res.status(400).json({ error: 'Invalid verification code' });
        return;
      }

      // Enable 2FA
      await TwoFactorService.enableTwoFactor(userId, secret, token);

      // Generate backup codes
      const backupCodes = await TwoFactorService.generateBackupCodes(userId, 10);

      // Send notification email
      await emailService.queueEmail({
        to: req.user?.email,
        templateName: 'twoFactorEnabled',
        variables: {
          firstName: req.user?.name?.split(' ')[0],
        },
        priority: 'high',
      });

      res.json({
        message: '2FA enabled successfully',
        backupCodes,
        warning: 'Save these backup codes in a safe place. You can use them to access your account if you lose access to your authenticator app.',
      });

      logger.info('2FA enabled', { userId });
    } catch (error) {
      logger.error('Failed to enable 2FA', { error });
      res.status(500).json({ error: 'Failed to enable 2FA' });
    }
  }

  /**
   * POST /auth/2fa/disable
   * Disable 2FA for user
   */
  static async disableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { password } = req.body; // In real implementation, require password confirmation

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!password) {
        res.status(400).json({ error: 'Password confirmation required' });
        return;
      }

      // Disable 2FA
      await TwoFactorService.disableTwoFactor(userId, password);

      res.json({ message: '2FA disabled successfully' });

      logger.info('2FA disabled', { userId });
    } catch (error) {
      logger.error('Failed to disable 2FA', { error });
      res.status(500).json({ error: 'Failed to disable 2FA' });
    }
  }

  /**
   * GET /auth/2fa/status
   * Get 2FA status for current user
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const isEnabled = await TwoFactorService.isTwoFactorEnabled(userId);
      const backupCodeCount = await TwoFactorService.getBackupCodeCount(userId);
      const trustedDevices = await TwoFactorTrustDevice.getTrustedDevices(userId);

      res.json({
        enabled: isEnabled,
        backupCodesRemaining: backupCodeCount,
        trustedDevices: trustedDevices.map(d => ({
          id: d.id,
          name: d.name,
          trustedAt: d.trustedAt,
          expiresAt: d.expiresAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to get 2FA status', { error });
      res.status(500).json({ error: 'Failed to get 2FA status' });
    }
  }

  /**
   * GET /auth/2fa/backup-codes
   * Get remaining backup codes
   */
  static async getBackupCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await TwoFactorService.getBackupCodeCount(userId);

      res.json({
        backupCodesRemaining: count,
        message: count === 0 ? 'No backup codes remaining. Generate new codes.' : `You have ${count} backup codes remaining.`,
      });
    } catch (error) {
      logger.error('Failed to get backup code count', { error });
      res.status(500).json({ error: 'Failed to get backup code count' });
    }
  }

  /**
   * POST /auth/2fa/backup-codes/regenerate
   * Generate new backup codes
   */
  static async regenerateBackupCodes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const isEnabled = await TwoFactorService.isTwoFactorEnabled(userId);
      if (!isEnabled) {
        res.status(400).json({ error: '2FA is not enabled for this account' });
        return;
      }

      const backupCodes = await TwoFactorService.generateBackupCodes(userId, 10);

      res.json({
        message: 'New backup codes generated successfully',
        backupCodes,
        warning: 'Your previous backup codes are no longer valid. Save these new codes in a safe place.',
      });

      logger.info('Backup codes regenerated', { userId });
    } catch (error) {
      logger.error('Failed to regenerate backup codes', { error });
      res.status(500).json({ error: 'Failed to regenerate backup codes' });
    }
  }

  /**
   * POST /auth/2fa/challenge
   * Create 2FA challenge during login
   */
  static async createChallenge(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.body.userId;

      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const isEnabled = await TwoFactorService.isTwoFactorEnabled(userId);
      if (!isEnabled) {
        res.status(400).json({ error: '2FA is not enabled for this account' });
        return;
      }

      const challengeId = await TwoFactorChallenge.createChallenge(userId, 5 * 60); // 5 minutes

      res.json({
        challengeId,
        expiresIn: 300,
        message: 'Enter the verification code from your authenticator app or use a backup code',
      });

      logger.info('2FA challenge created', { userId, challengeId });
    } catch (error) {
      logger.error('Failed to create 2FA challenge', { error });
      res.status(500).json({ error: 'Failed to create 2FA challenge' });
    }
  }

  /**
   * POST /auth/2fa/verify-challenge
   * Verify 2FA challenge with OTP
   */
  static async verifyChallengeWithOTP(req: Request, res: Response): Promise<void> {
    try {
      const { userId, challengeId, token, backupCode, trustDevice, deviceId, deviceName } = req.body;

      // Validate input
      const validation = validateInput({
        userId: { value: userId, type: 'string', required: true },
        challengeId: { value: challengeId, type: 'string', required: true },
      });

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }

      // Check if challenge is valid
      const status = await TwoFactorChallenge.getChallengeStatus(challengeId);
      if (!status) {
        res.status(400).json({ error: 'Challenge expired or invalid' });
        return;
      }

      let verified = false;

      // Try OTP first
      if (token) {
        const secret = await TwoFactorService.getUserSecret(userId);
        if (secret && TwoFactorService.verifyToken(secret, token)) {
          verified = true;
        }
      }

      // Try backup code if OTP failed
      if (!verified && backupCode) {
        verified = await TwoFactorService.useBackupCode(userId, backupCode);
      }

      if (!verified) {
        res.status(400).json({ error: 'Invalid verification code or backup code' });
        return;
      }

      // Verify and cancel challenge
      const result = await TwoFactorChallenge.verifyChallenge(userId, challengeId, token, await TwoFactorService.getUserSecret(userId));

      if (!result) {
        res.status(400).json({ error: 'Failed to verify challenge' });
        return;
      }

      // Trust device if requested
      if (trustDevice && deviceId) {
        await TwoFactorTrustDevice.trustDevice(userId, deviceId, deviceName || 'Unknown Device', 30 * 24 * 60 * 60);
      }

      // Cancel challenge
      await TwoFactorChallenge.cancelChallenge(challengeId);

      res.json({
        verified: true,
        message: '2FA verification successful',
        shouldIssueToken: true,
      });

      logger.info('2FA challenge verified', { userId, challengeId });
    } catch (error) {
      logger.error('Failed to verify 2FA challenge', { error });
      res.status(500).json({ error: 'Failed to verify 2FA challenge' });
    }
  }

  /**
   * GET /auth/2fa/trusted-devices
   * List trusted devices
   */
  static async getTrustedDevices(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const devices = await TwoFactorTrustDevice.getTrustedDevices(userId);

      res.json({
        devices: devices.map(d => ({
          id: d.id,
          name: d.name,
          trustedAt: d.trustedAt,
          expiresAt: d.expiresAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to get trusted devices', { error });
      res.status(500).json({ error: 'Failed to get trusted devices' });
    }
  }

  /**
   * DELETE /auth/2fa/trusted-devices/:deviceId
   * Remove trusted device
   */
  static async removeTrustedDevice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { deviceId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!deviceId) {
        res.status(400).json({ error: 'Device ID required' });
        return;
      }

      await TwoFactorTrustDevice.removeTrust(userId, deviceId);

      res.json({ message: 'Device trust removed' });

      logger.info('Trusted device removed', { userId, deviceId });
    } catch (error) {
      logger.error('Failed to remove trusted device', { error });
      res.status(500).json({ error: 'Failed to remove trusted device' });
    }
  }

  /**
   * POST /auth/2fa/trusted-devices/revoke-all
   * Revoke all device trusts
   */
  static async revokeAllDeviceTrusts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await TwoFactorTrustDevice.revokeAllTrusts(userId);

      res.json({ message: 'All device trusts revoked' });

      logger.info('All device trusts revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke all device trusts', { error });
      res.status(500).json({ error: 'Failed to revoke all device trusts' });
    }
  }
}

export default TwoFactorController;
