import { Request, Response } from 'express';
import { webhookService, WebhookEndpoint } from '../services/WebhookService';
import { logger } from '../config/logger';
import { validateInput } from '../utils/validation';

/**
 * Webhook Controller
 * Handles webhook endpoint management and event delivery
 */

export class WebhookController {
  /**
   * POST /webhooks
   * Register a new webhook endpoint
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { url, events, secret } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Validate input
      const validation = validateInput({
        url: { value: url, type: 'url', required: true },
        events: { value: events, type: 'array', required: true },
      });

      if (!validation.valid) {
        res.status(400).json({ errors: validation.errors });
        return;
      }

      // Validate event types
      const validEvents = [
        'user.created',
        'user.updated',
        'user.deleted',
        'client.created',
        'client.updated',
        'client.deleted',
        'client.secret_rotated',
        'token.generated',
        'token.revoked',
        'scope.created',
        'scope.updated',
        'scope.deleted',
        'login.successful',
        'login.failed',
        'password.changed',
        'mfa.enabled',
        'mfa.disabled',
      ];

      const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        res.status(400).json({ error: `Invalid event types: ${invalidEvents.join(', ')}` });
        return;
      }

      const endpoint = await webhookService.registerWebhook(userId, url, events, secret);

      res.status(201).json({
        id: endpoint.id,
        url: endpoint.url,
        events: endpoint.events,
        secret: endpoint.secret,
        message: 'Webhook registered successfully',
      });

      logger.info('Webhook registered', { userId, webhookId: endpoint.id });
    } catch (error) {
      logger.error('Failed to register webhook', { error });
      res.status(500).json({ error: 'Failed to register webhook' });
    }
  }

  /**
   * GET /webhooks
   * List all webhooks for user
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhooks = await webhookService.getUserWebhooks(userId);

      res.json({
        count: webhooks.length,
        webhooks: webhooks.map(w => ({
          id: w.id,
          url: w.url,
          events: w.events,
          isActive: w.isActive,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to list webhooks', { error });
      res.status(500).json({ error: 'Failed to list webhooks' });
    }
  }

  /**
   * GET /webhooks/:webhookId
   * Get webhook details
   */
  static async get(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        maxRetries: webhook.maxRetries,
        retryDelaySeconds: webhook.retryDelaySeconds,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt,
      });
    } catch (error) {
      logger.error('Failed to get webhook', { error });
      res.status(500).json({ error: 'Failed to get webhook' });
    }
  }

  /**
   * PATCH /webhooks/:webhookId
   * Update webhook
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;
      const updates = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Only allow certain fields to be updated
      const allowedUpdates = ['url', 'events', 'isActive', 'maxRetries', 'retryDelaySeconds'];
      const updateKeys = Object.keys(updates).filter(k => allowedUpdates.includes(k));

      if (updateKeys.length === 0) {
        res.status(400).json({ error: 'No valid fields to update' });
        return;
      }

      const updateData: Partial<WebhookEndpoint> = {};
      for (const key of updateKeys) {
        (updateData as any)[key] = updates[key];
      }

      const updated = await webhookService.updateWebhook(webhookId, updateData);

      if (!updated) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json({
        id: updated.id,
        url: updated.url,
        events: updated.events,
        isActive: updated.isActive,
        message: 'Webhook updated successfully',
      });

      logger.info('Webhook updated', { userId, webhookId });
    } catch (error) {
      logger.error('Failed to update webhook', { error });
      res.status(500).json({ error: 'Failed to update webhook' });
    }
  }

  /**
   * DELETE /webhooks/:webhookId
   * Delete webhook
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const deleted = await webhookService.deleteWebhook(webhookId);

      if (!deleted) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json({ message: 'Webhook deleted successfully' });

      logger.info('Webhook deleted', { userId, webhookId });
    } catch (error) {
      logger.error('Failed to delete webhook', { error });
      res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }

  /**
   * GET /webhooks/:webhookId/events
   * Get webhook event history
   */
  static async getEventHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const events = await webhookService.getEventHistory(webhookId, Math.min(limit, 1000));

      res.json({
        count: events.length,
        events: events.map(e => ({
          id: e.id,
          eventType: e.eventType,
          status: e.status,
          retries: e.retries,
          deliveredAt: e.deliveredAt,
          createdAt: e.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to get webhook event history', { error });
      res.status(500).json({ error: 'Failed to get webhook event history' });
    }
  }

  /**
   * POST /webhooks/:webhookId/events/:eventId/resend
   * Resend a failed webhook event
   */
  static async resendEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId, eventId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      const success = await webhookService.resendEvent(eventId);

      if (!success) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }

      res.json({ message: 'Event requeued for delivery' });

      logger.info('Webhook event requeued', { userId, webhookId, eventId });
    } catch (error) {
      logger.error('Failed to resend webhook event', { error });
      res.status(500).json({ error: 'Failed to resend webhook event' });
    }
  }

  /**
   * POST /webhooks/test
   * Test webhook delivery
   */
  static async test(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { webhookId } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!webhookId) {
        res.status(400).json({ error: 'Webhook ID required' });
        return;
      }

      const webhook = await webhookService.getWebhook(webhookId);

      if (!webhook || webhook.userId !== userId) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      // Trigger a test event
      await webhookService.triggerEvent('user.created', {
        userId: 'test_user_123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date().toISOString(),
        isTest: true,
      });

      res.json({
        message: 'Test webhook delivered',
        note: 'Check your webhook endpoint logs for delivery confirmation',
      });

      logger.info('Webhook test sent', { userId, webhookId });
    } catch (error) {
      logger.error('Failed to send test webhook', { error });
      res.status(500).json({ error: 'Failed to send test webhook' });
    }
  }
}

export default WebhookController;
