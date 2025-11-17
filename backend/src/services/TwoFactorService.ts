import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

/**
 * Two-Factor Authentication (2FA) / Multi-Factor Authentication (MFA)
 * TOTP-based authentication with QR code generation
 */

export interface TwoFactorSecret {
  secret: string;
  otpauth_url: string;
  qrCode: string; // Base64 encoded QR code image
}

export interface VerificationResult {
  valid: boolean;
  message: string;
}

/**
 * Two-Factor Authentication Service
 * Generates TOTP secrets, QR codes, and verifies OTP codes
 */
export class TwoFactorService {
  private readonly WINDOW = 2; // Allow codes within ±2 time steps
  private readonly SERVICE_NAME = 'Identity Service';

  /**
   * Generate new 2FA secret with QR code
   */
  async generateSecret(userId: string, email: string): Promise<TwoFactorSecret> {
    try {
      // Generate secret using speakeasy
      const secret = speakeasy.generateSecret({
        name: `${this.SERVICE_NAME} (${email})`,
        issuer: this.SERVICE_NAME,
        length: 32, // Standard length for TOTP secrets
      });

      // Generate QR code as base64 PNG
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      logger.info('2FA secret generated', { userId });

      return {
        secret: secret.base32!,
        otpauth_url: secret.otpauth_url!,
        qrCode,
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret', { userId, error });
      throw error;
    }
  }

  /**
   * Verify OTP token
   */
  verifyToken(secret: string, token: string): VerificationResult {
    try {
      // Remove spaces from token
      const cleanToken = token.replace(/\s/g, '');

      // Verify using speakeasy
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window: this.WINDOW,
      });

      if (isValid) {
        logger.debug('2FA token verified successfully');
        return { valid: true, message: 'Token verified' };
      } else {
        logger.warn('Invalid 2FA token provided');
        return { valid: false, message: 'Invalid or expired token' };
      }
    } catch (error) {
      logger.error('2FA verification error', { error });
      return { valid: false, message: 'Verification failed' };
    }
  }

  /**
   * Enable 2FA for user
   * Stores secret in database after user confirms with OTP
   */
  async enableTwoFactor(userId: string, secret: string, confirmationToken: string): Promise<boolean> {
    try {
      // Verify the confirmation token first
      const verification = this.verifyToken(secret, confirmationToken);
      if (!verification.valid) {
        logger.warn('2FA confirmation token invalid', { userId });
        return false;
      }

      // Store secret in Redis with expiry (backup codes should be generated separately)
      const twoFactorKey = `2fa:secret:${userId}`;
      await redis.setex(twoFactorKey, 7 * 24 * 60 * 60, secret); // 7 days validity

      logger.info('2FA enabled for user', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to enable 2FA', { userId, error });
      return false;
    }
  }

  /**
   * Disable 2FA for user
   */
  async disableTwoFactor(userId: string, password: string): Promise<boolean> {
    try {
      // In real implementation, verify password first
      // This is a placeholder - actual implementation would verify password in AuthService

      const twoFactorKey = `2fa:secret:${userId}`;
      await redis.del(twoFactorKey);

      // Clear backup codes
      await redis.del(`2fa:backup:${userId}`);

      logger.info('2FA disabled for user', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to disable 2FA', { userId, error });
      return false;
    }
  }

  /**
   * Get user's 2FA secret (if enabled)
   */
  async getUserSecret(userId: string): Promise<string | null> {
    try {
      const twoFactorKey = `2fa:secret:${userId}`;
      const secret = await redis.get(twoFactorKey);
      return secret;
    } catch (error) {
      logger.error('Failed to get user 2FA secret', { userId, error });
      return null;
    }
  }

  /**
   * Check if user has 2FA enabled
   */
  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const secret = await this.getUserSecret(userId);
    return !!secret;
  }

  /**
   * Generate backup codes for account recovery
   * User can use these if they lose access to authenticator app
   */
  async generateBackupCodes(userId: string, count: number = 10): Promise<string[]> {
    try {
      const codes: string[] = [];

      for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric codes
        const code = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();
        codes.push(code);
      }

      // Hash and store codes in Redis
      const hashedCodes = codes.map((code) => {
        // In production, hash these codes for security
        return code;
      });

      const backupKey = `2fa:backup:${userId}`;
      await redis.setex(backupKey, 365 * 24 * 60 * 60, JSON.stringify(hashedCodes)); // 1 year

      logger.info('Backup codes generated', { userId, count });
      return codes;
    } catch (error) {
      logger.error('Failed to generate backup codes', { userId, error });
      throw error;
    }
  }

  /**
   * Use a backup code
   * Removes it from the list after use
   */
  async useBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const backupKey = `2fa:backup:${userId}`;
      const codesJson = await redis.get(backupKey);

      if (!codesJson) {
        logger.warn('No backup codes found', { userId });
        return false;
      }

      const codes: string[] = JSON.parse(codesJson);
      const codeIndex = codes.indexOf(code);

      if (codeIndex === -1) {
        logger.warn('Invalid backup code', { userId });
        return false;
      }

      // Remove used code
      codes.splice(codeIndex, 1);

      if (codes.length > 0) {
        await redis.setex(backupKey, 365 * 24 * 60 * 60, JSON.stringify(codes));
      } else {
        // All codes used
        await redis.del(backupKey);
        logger.warn('All backup codes have been used', { userId });
      }

      logger.info('Backup code used', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to use backup code', { userId, error });
      return false;
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodeCount(userId: string): Promise<number> {
    try {
      const backupKey = `2fa:backup:${userId}`;
      const codesJson = await redis.get(backupKey);

      if (!codesJson) {
        return 0;
      }

      const codes: string[] = JSON.parse(codesJson);
      return codes.length;
    } catch (error) {
      logger.error('Failed to get backup code count', { userId, error });
      return 0;
    }
  }
}

/**
 * 2FA Challenge Management
 * Manages pending 2FA verification challenges
 */
export class TwoFactorChallenge {
  /**
   * Create 2FA challenge (after successful password login)
   */
  static async createChallenge(userId: string, expiresIn: number = 5 * 60): Promise<string> {
    try {
      const challengeId = `2fa:challenge:${userId}:${Date.now()}`;
      await redis.setex(challengeId, expiresIn, 'pending');

      logger.info('2FA challenge created', { userId, challengeId });
      return challengeId;
    } catch (error) {
      logger.error('Failed to create 2FA challenge', { userId, error });
      throw error;
    }
  }

  /**
   * Verify 2FA challenge
   */
  static async verifyChallenge(userId: string, challengeId: string, otp: string, secret: string): Promise<boolean> {
    try {
      // Check if challenge exists
      const exists = await redis.exists(challengeId);
      if (!exists) {
        logger.warn('2FA challenge not found or expired', { userId, challengeId });
        return false;
      }

      // Verify OTP token
      const twoFactorService = new TwoFactorService();
      const verification = twoFactorService.verifyToken(secret, otp);

      if (!verification.valid) {
        logger.warn('Invalid OTP for challenge', { userId });
        return false;
      }

      // Mark challenge as verified
      await redis.del(challengeId);

      logger.info('2FA challenge verified', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to verify 2FA challenge', { userId, error });
      return false;
    }
  }

  /**
   * Cancel 2FA challenge
   */
  static async cancelChallenge(challengeId: string): Promise<boolean> {
    try {
      await redis.del(challengeId);
      logger.info('2FA challenge cancelled', { challengeId });
      return true;
    } catch (error) {
      logger.error('Failed to cancel 2FA challenge', { error });
      return false;
    }
  }

  /**
   * Get challenge status
   */
  static async getChallengeStatus(challengeId: string): Promise<boolean> {
    try {
      const exists = await redis.exists(challengeId);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to get challenge status', { error });
      return false;
    }
  }
}

/**
 * 2FA Trust Device Management
 * Allow users to trust devices to skip 2FA on subsequent logins
 */
export class TwoFactorTrustDevice {
  /**
   * Trust a device
   */
  static async trustDevice(userId: string, deviceId: string, deviceName: string, expiresIn: number = 30 * 24 * 60 * 60): Promise<boolean> {
    try {
      const trustKey = `2fa:trust:${userId}:${deviceId}`;
      const trustData = {
        deviceName,
        trustedAt: new Date(),
        lastUsed: new Date(),
      };

      await redis.setex(trustKey, expiresIn, JSON.stringify(trustData));

      // Track trusted devices list
      const devicesKey = `2fa:trusted_devices:${userId}`;
      const devices = (await redis.get(devicesKey))
        ? JSON.parse(await redis.get(devicesKey))
        : [];

      devices.push({ deviceId, deviceName, trustedAt: new Date() });
      await redis.setex(devicesKey, expiresIn, JSON.stringify(devices));

      logger.info('Device trusted for 2FA bypass', { userId, deviceId, deviceName });
      return true;
    } catch (error) {
      logger.error('Failed to trust device', { userId, error });
      return false;
    }
  }

  /**
   * Check if device is trusted
   */
  static async isTrusted(userId: string, deviceId: string): Promise<boolean> {
    try {
      const trustKey = `2fa:trust:${userId}:${deviceId}`;
      const exists = await redis.exists(trustKey);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check device trust', { userId, error });
      return false;
    }
  }

  /**
   * Remove device trust
   */
  static async removeTrust(userId: string, deviceId: string): Promise<boolean> {
    try {
      const trustKey = `2fa:trust:${userId}:${deviceId}`;
      await redis.del(trustKey);

      logger.info('Device trust removed', { userId, deviceId });
      return true;
    } catch (error) {
      logger.error('Failed to remove device trust', { userId, error });
      return false;
    }
  }

  /**
   * Get list of trusted devices
   */
  static async getTrustedDevices(userId: string): Promise<any[]> {
    try {
      const devicesKey = `2fa:trusted_devices:${userId}`;
      const devicesJson = await redis.get(devicesKey);

      if (!devicesJson) {
        return [];
      }

      return JSON.parse(devicesJson);
    } catch (error) {
      logger.error('Failed to get trusted devices', { userId, error });
      return [];
    }
  }

  /**
   * Revoke all trusted devices
   */
  static async revokeAllTrusts(userId: string): Promise<boolean> {
    try {
      const pattern = `2fa:trust:${userId}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      // Clear devices list
      await redis.del(`2fa:trusted_devices:${userId}`);

      logger.info('All trusted devices revoked', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to revoke all trusts', { userId, error });
      return false;
    }
  }
}

// Export singleton instance
export const twoFactorService = new TwoFactorService();

export default {
  twoFactorService,
  TwoFactorChallenge,
  TwoFactorTrustDevice,
};
