import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

/**
 * Webhook Event Service
 * Manages webhook events with retry logic, signature verification, and delivery tracking
 */

export type WebhookEventType = 
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'client.secret_rotated'
  | 'token.generated'
  | 'token.revoked'
  | 'scope.created'
  | 'scope.updated'
  | 'scope.deleted'
  | 'login.successful'
  | 'login.failed'
  | 'password.changed'
  | 'mfa.enabled'
  | 'mfa.disabled';

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

export interface WebhookEndpoint {
  id: string;
  userId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  isActive: boolean;
  maxRetries: number;
  retryDelaySeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookEvent {
  id: string;
  endpointId: string;
  eventType: WebhookEventType;
  payload: WebhookPayload;
  status: 'pending' | 'delivered' | 'failed';
  retries: number;
  nextRetryAt?: Date;
  lastError?: string;
  deliveredAt?: Date;
  createdAt: Date;
}

/**
 * Webhook Service
 */
export class WebhookService {
  private readonly MAX_RETRIES = 5;
  private readonly INITIAL_RETRY_DELAY = 60; // 1 minute
  private readonly MAX_RETRY_DELAY = 86400; // 24 hours
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  /**
   * Generate webhook signature (HMAC-SHA256)
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  /**
   * Register webhook endpoint
   */
  async registerWebhook(
    userId: string,
    url: string,
    events: WebhookEventType[],
    secret?: string
  ): Promise<WebhookEndpoint> {
    try {
      const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

      const endpoint: WebhookEndpoint = {
        id: webhookId,
        userId,
        url,
        events,
        secret: webhookSecret,
        isActive: true,
        maxRetries: this.MAX_RETRIES,
        retryDelaySeconds: this.INITIAL_RETRY_DELAY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store in Redis
      const key = `webhook:endpoint:${webhookId}`;
      await redis.setex(key, 365 * 24 * 60 * 60, JSON.stringify(endpoint)); // 1 year

      // Add to user's webhook list
      const userKey = `webhook:user:${userId}`;
      const webhooks = (await redis.get(userKey)) ? JSON.parse(await redis.get(userKey)) : [];
      webhooks.push(webhookId);
      await redis.setex(userKey, 365 * 24 * 60 * 60, JSON.stringify(webhooks));

      logger.info('Webhook registered', { userId, webhookId, url });
      return endpoint;
    } catch (error) {
      logger.error('Failed to register webhook', { userId, error });
      throw error;
    }
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(webhookId: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint | null> {
    try {
      const key = `webhook:endpoint:${webhookId}`;
      const existing = await redis.get(key);

      if (!existing) {
        logger.warn('Webhook not found', { webhookId });
        return null;
      }

      const endpoint = JSON.parse(existing) as WebhookEndpoint;
      const updated = { ...endpoint, ...updates, updatedAt: new Date() };

      await redis.setex(key, 365 * 24 * 60 * 60, JSON.stringify(updated));

      logger.info('Webhook updated', { webhookId });
      return updated;
    } catch (error) {
      logger.error('Failed to update webhook', { webhookId, error });
      throw error;
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const key = `webhook:endpoint:${webhookId}`;
      const existing = await redis.get(key);

      if (!existing) {
        return false;
      }

      const endpoint = JSON.parse(existing) as WebhookEndpoint;

      // Remove from user's list
      const userKey = `webhook:user:${endpoint.userId}`;
      const webhooks = (await redis.get(userKey)) ? JSON.parse(await redis.get(userKey)) : [];
      const filtered = webhooks.filter((id: string) => id !== webhookId);
      await redis.setex(userKey, 365 * 24 * 60 * 60, JSON.stringify(filtered));

      // Delete endpoint
      await redis.del(key);

      logger.info('Webhook deleted', { webhookId });
      return true;
    } catch (error) {
      logger.error('Failed to delete webhook', { webhookId, error });
      throw error;
    }
  }

  /**
   * Get webhook endpoint
   */
  async getWebhook(webhookId: string): Promise<WebhookEndpoint | null> {
    try {
      const key = `webhook:endpoint:${webhookId}`;
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get webhook', { webhookId, error });
      return null;
    }
  }

  /**
   * List user's webhooks
   */
  async getUserWebhooks(userId: string): Promise<WebhookEndpoint[]> {
    try {
      const userKey = `webhook:user:${userId}`;
      const webhookIds = (await redis.get(userKey)) ? JSON.parse(await redis.get(userKey)) : [];

      const webhooks: WebhookEndpoint[] = [];
      for (const webhookId of webhookIds) {
        const webhook = await this.getWebhook(webhookId);
        if (webhook) {
          webhooks.push(webhook);
        }
      }

      return webhooks;
    } catch (error) {
      logger.error('Failed to list webhooks', { userId, error });
      return [];
    }
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(eventType: WebhookEventType, data: Record<string, any>): Promise<void> {
    try {
      const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload: WebhookPayload = {
        eventId,
        eventType,
        timestamp: new Date().toISOString(),
        data,
      };

      // Find all active webhooks subscribed to this event type
      const pattern = 'webhook:endpoint:*';
      const keys = await redis.keys(pattern);

      for (const key of keys) {
        const endpointData = await redis.get(key);
        if (!endpointData) continue;

        const endpoint = JSON.parse(endpointData) as WebhookEndpoint;

        if (!endpoint.isActive || !endpoint.events.includes(eventType)) {
          continue;
        }

        // Queue event for delivery
        await this.queueEvent(endpoint.id, eventType, payload);
      }

      logger.info('Webhook event triggered', { eventId, eventType });
    } catch (error) {
      logger.error('Failed to trigger webhook event', { eventType, error });
    }
  }

  /**
   * Queue webhook event for delivery
   */
  private async queueEvent(
    endpointId: string,
    eventType: WebhookEventType,
    payload: WebhookPayload
  ): Promise<void> {
    try {
      const eventId = `webhook:event:${endpointId}:${payload.eventId}`;

      const event: WebhookEvent = {
        id: eventId,
        endpointId,
        eventType,
        payload,
        status: 'pending',
        retries: 0,
        createdAt: new Date(),
      };

      // Add to delivery queue
      const queueKey = 'webhook:delivery:queue';
      await redis.lpush(queueKey, JSON.stringify(event));

      logger.debug('Webhook event queued', { eventId, endpointId });
    } catch (error) {
      logger.error('Failed to queue webhook event', { endpointId, error });
    }
  }

  /**
   * Process webhook delivery queue
   * Called by a background job/worker
   */
  async processDeliveryQueue(): Promise<void> {
    try {
      const queueKey = 'webhook:delivery:queue';
      let eventData = await redis.rpop(queueKey);

      while (eventData) {
        const event = JSON.parse(eventData) as WebhookEvent;
        const endpoint = await this.getWebhook(event.endpointId);

        if (!endpoint) {
          logger.warn('Webhook endpoint not found', { endpointId: event.endpointId });
          eventData = await redis.rpop(queueKey);
          continue;
        }

        const success = await this.deliverEvent(endpoint, event);

        if (!success && event.retries < endpoint.maxRetries) {
          // Schedule retry
          const delaySeconds = Math.min(
            endpoint.retryDelaySeconds * Math.pow(2, event.retries),
            this.MAX_RETRY_DELAY
          );

          event.retries++;
          event.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
          event.status = 'pending';

          // Re-queue with delay
          await redis.lpush(queueKey, JSON.stringify(event));
          logger.info('Webhook delivery retry scheduled', { eventId: event.id, retries: event.retries });
        } else if (!success) {
          event.status = 'failed';
          logger.error('Webhook delivery failed after max retries', { eventId: event.id });
        }

        eventData = await redis.rpop(queueKey);
      }
    } catch (error) {
      logger.error('Webhook delivery queue processing error', { error });
    }
  }

  /**
   * Deliver webhook event to endpoint
   */
  private async deliverEvent(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<boolean> {
    try {
      const payloadString = JSON.stringify(event.payload);
      const signature = WebhookService.generateSignature(payloadString, endpoint.secret);

      const response = await axios.post(endpoint.url, event.payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-ID': event.endpointId,
          'X-Event-Type': event.eventType,
          'X-Event-ID': event.payload.eventId,
        },
        timeout: this.REQUEST_TIMEOUT,
      });

      if (response.status >= 200 && response.status < 300) {
        event.status = 'delivered';
        event.deliveredAt = new Date();

        logger.info('Webhook delivered successfully', {
          eventId: event.id,
          endpointId: endpoint.id,
          statusCode: response.status,
        });

        return true;
      }

      event.lastError = `HTTP ${response.status}`;
      return false;
    } catch (error) {
      const axiosError = error as AxiosError;
      event.lastError = axiosError.message || 'Unknown error';

      logger.warn('Webhook delivery failed', {
        eventId: event.id,
        endpointId: endpoint.id,
        error: event.lastError,
      });

      return false;
    }
  }

  /**
   * Get webhook event history
   */
  async getEventHistory(endpointId: string, limit: number = 100): Promise<WebhookEvent[]> {
    try {
      const pattern = `webhook:event:${endpointId}:*`;
      const keys = await redis.keys(pattern);

      const events: WebhookEvent[] = [];
      for (const key of keys.slice(0, limit)) {
        const data = await redis.get(key);
        if (data) {
          events.push(JSON.parse(data));
        }
      }

      return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      logger.error('Failed to get event history', { endpointId, error });
      return [];
    }
  }

  /**
   * Resend a failed webhook event
   */
  async resendEvent(eventId: string): Promise<boolean> {
    try {
      const key = `webhook:event:${eventId}`;
      const eventData = await redis.get(key);

      if (!eventData) {
        logger.warn('Webhook event not found', { eventId });
        return false;
      }

      const event = JSON.parse(eventData) as WebhookEvent;
      event.status = 'pending';
      event.retries = 0;

      // Re-queue for delivery
      const queueKey = 'webhook:delivery:queue';
      await redis.lpush(queueKey, JSON.stringify(event));

      logger.info('Webhook event requeued', { eventId });
      return true;
    } catch (error) {
      logger.error('Failed to resend webhook event', { eventId, error });
      return false;
    }
  }
}

// Export singleton instance
export const webhookService = new WebhookService();

export default webhookService;
