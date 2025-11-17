import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

/**
 * Email Notification Service
 * Handles user notifications via email with queue system
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  templateName: string;
  variables: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Email templates
 */
const emailTemplates = {
  // User Registration Confirmation
  registration: (firstName: string, email: string, confirmLink: string): EmailTemplate => ({
    subject: 'Welcome to Identity Service - Confirm Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome, ${firstName}!</h1>
        <p>Thank you for registering with Identity Service.</p>
        <p>Please confirm your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Confirm Email
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          If you did not create this account, please ignore this email.
        </p>
      </div>
    `,
    text: `Welcome, ${firstName}!\n\nPlease confirm your email by visiting: ${confirmLink}\n\nIf you did not create this account, please ignore this email.`,
  }),

  // Password Reset
  passwordReset: (firstName: string, resetLink: string, expiresIn: number): EmailTemplate => ({
    subject: 'Reset Your Password - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
        </div>
        <p style="color: #ff6b6b; font-weight: bold;">
          This link expires in ${expiresIn} minutes.
        </p>
        <p style="color: #666; font-size: 12px;">
          If you did not request this, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `,
    text: `Password Reset Request\n\nReset your password here: ${resetLink}\n\nThis link expires in ${expiresIn} minutes.\n\nIf you did not request this, ignore this email.`,
  }),

  // Suspicious Login Alert
  suspiciousLogin: (firstName: string, ip: string, location: string, timestamp: string): EmailTemplate => ({
    subject: '⚠️ Suspicious Login Alert - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b6b;">⚠️ Suspicious Activity Detected</h1>
        <p>Hi ${firstName},</p>
        <p>We detected a login attempt from an unusual location:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
          <p><strong>IP Address:</strong> ${ip}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Time:</strong> ${timestamp}</p>
        </div>
        <p>If this was you, you can ignore this email.</p>
        <p>If this wasn't you, <strong>change your password immediately</strong>.</p>
        <p style="color: #666; font-size: 12px;">
          For security, we recommend enabling two-factor authentication on your account.
        </p>
      </div>
    `,
    text: `⚠️ Suspicious Login Alert\n\nWe detected a login from:\nIP: ${ip}\nLocation: ${location}\nTime: ${timestamp}\n\nIf this wasn't you, change your password immediately.`,
  }),

  // OAuth Client Registered
  clientRegistered: (firstName: string, clientName: string, dashboardLink: string): EmailTemplate => ({
    subject: 'New OAuth Client Registered - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">OAuth Client Registered</h1>
        <p>Hi ${firstName},</p>
        <p>A new OAuth client has been registered on your account:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
          <p><strong>Client Name:</strong> ${clientName}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        <p>You can manage this client from your dashboard:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${dashboardLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Dashboard
          </a>
        </div>
      </div>
    `,
    text: `OAuth Client Registered\n\nClient Name: ${clientName}\n\nManage your clients here: ${dashboardLink}`,
  }),

  // OAuth Client Secret Rotated
  secretRotated: (firstName: string, clientName: string): EmailTemplate => ({
    subject: 'OAuth Client Secret Rotated - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Client Secret Rotated</h1>
        <p>Hi ${firstName},</p>
        <p>The client secret for <strong>${clientName}</strong> has been successfully rotated.</p>
        <p style="color: #ff6b6b; font-weight: bold;">
          ⚠️ The previous secret is no longer valid. Update your applications immediately.
        </p>
        <p style="color: #666; font-size: 12px;">
          This action enhances the security of your OAuth client.
        </p>
      </div>
    `,
    text: `Client Secret Rotated\n\nThe secret for ${clientName} has been rotated.\n\n⚠️ Update your applications immediately.`,
  }),

  // Two-Factor Authentication Enabled
  twoFactorEnabled: (firstName: string): EmailTemplate => ({
    subject: '✅ Two-Factor Authentication Enabled - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #28a745;">✅ Two-Factor Authentication Enabled</h1>
        <p>Hi ${firstName},</p>
        <p>Two-factor authentication has been successfully enabled on your account.</p>
        <p>You will now be required to provide a code from your authenticator app when logging in.</p>
        <p style="color: #666; font-size: 12px;">
          Keep your authenticator app secure and backed up. If you lose access, you may not be able to login to your account.
        </p>
      </div>
    `,
    text: `Two-Factor Authentication Enabled\n\nTwo-factor authentication is now active on your account.\n\nYou will need a code from your authenticator app to login.`,
  }),

  // Account Security Alert
  securityAlert: (firstName: string, alertType: string, action: string): EmailTemplate => ({
    subject: '🔐 Account Security Alert - Identity Service',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #ff6b6b;">🔐 Account Security Alert</h1>
        <p>Hi ${firstName},</p>
        <p>We detected the following security-related activity on your account:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
          <p><strong>Alert Type:</strong> ${alertType}</p>
          <p><strong>Action:</strong> ${action}</p>
        </div>
        <p>If this was not you, please contact support immediately.</p>
      </div>
    `,
    text: `Account Security Alert\n\nAlert: ${alertType}\nAction: ${action}\n\nIf this wasn't you, contact support.`,
  }),
};

/**
 * Email Service using Nodemailer
 */
export class EmailService {
  private transporter: any;

  constructor() {
    // Configure email transporter based on environment
    if (config.email.provider === 'smtp') {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.password,
        },
      });
    } else if (config.email.provider === 'sendgrid') {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        auth: {
          user: 'apikey',
          pass: config.email.sendgrid.apiKey,
        },
      });
    } else {
      // Development mode - use test account
      logger.warn('Email service running in development mode');
      this.transporter = null;
    }
  }

  /**
   * Send email immediately
   */
  async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      if (!this.transporter) {
        logger.info('Email would be sent (dev mode)', { to, subject: template.subject });
        return true;
      }

      const result = await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info('Email sent successfully', {
        to,
        subject: template.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', { to, error });
      return false;
    }
  }

  /**
   * Queue email for sending (with retry)
   */
  async queueEmail(options: EmailOptions): Promise<boolean> {
    try {
      const template = (emailTemplates as any)[options.templateName];
      if (!template) {
        logger.error('Email template not found', { templateName: options.templateName });
        return false;
      }

      const emailTemplate = typeof template === 'function' ? template(...Object.values(options.variables)) : template;

      // Add to queue in Redis
      const queueItem = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: options.to,
        template: emailTemplate,
        priority: options.priority || 'normal',
        retries: 0,
        maxRetries: 3,
        createdAt: new Date(),
      };

      const key = `email:queue:${options.priority || 'normal'}`;
      await redis.lpush(key, JSON.stringify(queueItem));

      logger.info('Email queued', { queueId: queueItem.id, to: options.to });

      return true;
    } catch (error) {
      logger.error('Failed to queue email', { error });
      return false;
    }
  }

  /**
   * Process queued emails
   */
  async processEmailQueue(): Promise<void> {
    try {
      const priorities = ['high', 'normal', 'low'];

      for (const priority of priorities) {
        const key = `email:queue:${priority}`;
        let queueItem = await redis.rpop(key);

        while (queueItem) {
          const item = JSON.parse(queueItem);
          const sent = await this.sendEmail(item.to, item.template);

          if (!sent && item.retries < item.maxRetries) {
            // Retry: push back to queue
            item.retries++;
            await redis.lpush(key, JSON.stringify(item));
            logger.info('Email requeued', { queueId: item.id, retries: item.retries });
          } else if (!sent) {
            // Max retries exceeded
            logger.error('Email delivery failed after max retries', { queueId: item.id });
          }

          queueItem = await redis.rpop(key);
        }
      }
    } catch (error) {
      logger.error('Email queue processing error', { error });
    }
  }

  /**
   * Send registration confirmation
   */
  async sendRegistrationConfirmation(email: string, firstName: string, confirmToken: string): Promise<boolean> {
    const confirmLink = `${config.app.frontendUrl}/confirm?token=${confirmToken}`;
    const template = emailTemplates.registration(firstName, email, confirmLink);
    return this.sendEmail(email, template);
  }

  /**
   * Send password reset
   */
  async sendPasswordReset(email: string, firstName: string, resetToken: string, expiresIn: number = 30): Promise<boolean> {
    const resetLink = `${config.app.frontendUrl}/reset-password?token=${resetToken}`;
    const template = emailTemplates.passwordReset(firstName, resetLink, expiresIn);
    return this.sendEmail(email, template);
  }

  /**
   * Send suspicious login alert
   */
  async sendSuspiciousLoginAlert(
    email: string,
    firstName: string,
    ip: string,
    location: string
  ): Promise<boolean> {
    const timestamp = new Date().toLocaleString();
    const template = emailTemplates.suspiciousLogin(firstName, ip, location, timestamp);
    return this.queueEmail({ to: email, templateName: 'suspiciousLogin', variables: { firstName, ip, location } });
  }

  /**
   * Send OAuth client registered notification
   */
  async sendClientRegistered(email: string, firstName: string, clientName: string): Promise<boolean> {
    const dashboardLink = `${config.app.frontendUrl}/dashboard/clients`;
    const template = emailTemplates.clientRegistered(firstName, clientName, dashboardLink);
    return this.sendEmail(email, template);
  }

  /**
   * Send client secret rotated notification
   */
  async sendSecretRotated(email: string, firstName: string, clientName: string): Promise<boolean> {
    const template = emailTemplates.secretRotated(firstName, clientName);
    return this.sendEmail(email, template);
  }

  /**
   * Send 2FA enabled notification
   */
  async sendTwoFactorEnabled(email: string, firstName: string): Promise<boolean> {
    const template = emailTemplates.twoFactorEnabled(firstName);
    return this.sendEmail(email, template);
  }

  /**
   * Send generic security alert
   */
  async sendSecurityAlert(
    email: string,
    firstName: string,
    alertType: string,
    action: string
  ): Promise<boolean> {
    const template = emailTemplates.securityAlert(firstName, alertType, action);
    return this.queueEmail({ to: email, templateName: 'securityAlert', variables: { firstName, alertType, action } });
  }
}

// Export singleton instance
export const emailService = new EmailService();

export default emailService;
