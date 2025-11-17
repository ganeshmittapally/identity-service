import { Request, Response } from 'express';
import { emailService } from '../services/EmailService';
import { logger } from '../config/logger';
import { validateInput } from '../utils/validation';

/**
 * Email Controller
 * Handles email-related endpoints (resend, preferences, etc.)
 */

export class EmailController {
  /**
   * POST /auth/email/resend-confirmation
   * Resend verification email
   */
  static async resendConfirmation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const email = req.user?.email;

      if (!userId || !email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if email already verified
      if (req.user?.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }

      // Generate verification token (should be done by AuthService in real implementation)
      const verificationToken = Buffer.from(`${userId}:${Date.now()}`).toString('base64');

      // Send confirmation email
      await emailService.queueEmail({
        to: email,
        templateName: 'registration',
        variables: {
          firstName: req.user?.name?.split(' ')[0],
          email,
          confirmLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
        },
        priority: 'high',
      });

      res.json({
        message: 'Confirmation email sent successfully',
      });

      logger.info('Confirmation email resent', { userId, email });
    } catch (error) {
      logger.error('Failed to resend confirmation email', { error });
      res.status(500).json({ error: 'Failed to resend confirmation email' });
    }
  }

  /**
   * POST /auth/email/request-password-reset
   * Request password reset email
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      // Validate input
      const validation = validateInput({
        email: { value: email, type: 'email', required: true },
      });

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }

      // Look up user by email (should be done by UserService)
      // For now, just log that we would send the email
      // In real implementation, check if user exists first

      // Generate password reset token (should be done by AuthService)
      const resetToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');

      // Send password reset email
      await emailService.queueEmail({
        to: email,
        templateName: 'passwordReset',
        variables: {
          email,
          resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
        priority: 'high',
      });

      // Always return success for security (don't reveal if email exists)
      res.json({
        message: 'If an account exists with this email, a password reset link will be sent',
      });

      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', { error });
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  }

  /**
   * GET /auth/email/preferences
   * Get email preferences for user
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // In real implementation, fetch from database
      const preferences = {
        marketing: true,
        security: true,
        productUpdates: true,
        weeklyDigest: false,
        loginAlerts: true,
        newDeviceAlerts: true,
        passwordChangeAlerts: true,
      };

      res.json(preferences);
    } catch (error) {
      logger.error('Failed to get email preferences', { error });
      res.status(500).json({ error: 'Failed to get email preferences' });
    }
  }

  /**
   * POST /auth/email/preferences
   * Update email preferences
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const preferences = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate that preferences object only contains boolean values
      const validKeys = ['marketing', 'security', 'productUpdates', 'weeklyDigest', 'loginAlerts', 'newDeviceAlerts', 'passwordChangeAlerts'];
      const isValid = Object.keys(preferences).every(
        key => validKeys.includes(key) && typeof preferences[key] === 'boolean'
      );

      if (!isValid) {
        res.status(400).json({ error: 'Invalid preferences format' });
        return;
      }

      // In real implementation, update in database
      // await userService.updateEmailPreferences(userId, preferences);

      res.json({
        message: 'Email preferences updated successfully',
        preferences,
      });

      logger.info('Email preferences updated', { userId });
    } catch (error) {
      logger.error('Failed to update email preferences', { error });
      res.status(500).json({ error: 'Failed to update email preferences' });
    }
  }

  /**
   * POST /auth/email/verify
   * Verify email with token
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token required' });
        return;
      }

      // Decode token (in real implementation, validate signature and expiry)
      let decoded: { userId: string; timestamp: number };
      try {
        const decoded_str = Buffer.from(token, 'base64').toString('utf-8');
        const [userId, timestamp] = decoded_str.split(':');
        decoded = { userId, timestamp: parseInt(timestamp, 10) };

        // Check if token is less than 24 hours old
        const now = Date.now();
        if (now - decoded.timestamp > 24 * 60 * 60 * 1000) {
          res.status(400).json({ error: 'Verification token has expired' });
          return;
        }
      } catch (e) {
        res.status(400).json({ error: 'Invalid verification token' });
        return;
      }

      // In real implementation, mark email as verified in database
      // await userService.verifyEmail(decoded.userId);

      res.json({ message: 'Email verified successfully' });

      logger.info('Email verified', { userId: decoded.userId });
    } catch (error) {
      logger.error('Failed to verify email', { error });
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  /**
   * POST /auth/email/change-request
   * Request email change with verification
   */
  static async requestEmailChange(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { newEmail } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate input
      const validation = validateInput({
        newEmail: { value: newEmail, type: 'email', required: true },
      });

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }

      if (newEmail === req.user?.email) {
        res.status(400).json({ error: 'New email must be different from current email' });
        return;
      }

      // In real implementation, check if email is already in use
      // Send verification email to new address
      const changeToken = Buffer.from(`${userId}:${newEmail}:${Date.now()}`).toString('base64');

      await emailService.queueEmail({
        to: newEmail,
        templateName: 'registration',
        variables: {
          firstName: req.user?.name?.split(' ')[0],
          email: newEmail,
          confirmLink: `${process.env.FRONTEND_URL}/verify-email-change?token=${changeToken}`,
        },
        priority: 'high',
      });

      res.json({
        message: 'A verification email has been sent to the new email address',
      });

      logger.info('Email change requested', { userId, newEmail });
    } catch (error) {
      logger.error('Failed to request email change', { error });
      res.status(500).json({ error: 'Failed to request email change' });
    }
  }

  /**
   * POST /auth/email/confirm-change
   * Confirm email change with token
   */
  static async confirmEmailChange(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Change token required' });
        return;
      }

      // Decode token
      let decoded: { userId: string; newEmail: string; timestamp: number };
      try {
        const decoded_str = Buffer.from(token, 'base64').toString('utf-8');
        const [userId, newEmail, timestamp] = decoded_str.split(':');
        decoded = { userId, newEmail, timestamp: parseInt(timestamp, 10) };

        // Check if token is less than 24 hours old
        const now = Date.now();
        if (now - decoded.timestamp > 24 * 60 * 60 * 1000) {
          res.status(400).json({ error: 'Change token has expired' });
          return;
        }
      } catch (e) {
        res.status(400).json({ error: 'Invalid change token' });
        return;
      }

      // In real implementation, update email in database
      // await userService.updateEmail(decoded.userId, decoded.newEmail);

      res.json({ message: 'Email changed successfully' });

      logger.info('Email changed', { userId: decoded.userId, newEmail: decoded.newEmail });
    } catch (error) {
      logger.error('Failed to confirm email change', { error });
      res.status(500).json({ error: 'Failed to confirm email change' });
    }
  }
}

export default EmailController;
