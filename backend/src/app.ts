import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { logger, morganLogger } from './config/logger';
import { AppError } from './types';
import authRoutes from './routes/authRoutes';
import tokenRoutes from './routes/tokenRoutes';
import clientRoutes from './routes/clientRoutes';
import scopeRoutes from './routes/scopeRoutes';
// Phase 3b: Email, 2FA, Webhooks
import twoFactorRoutes from './routes/twoFactorRoutes';
import emailRoutes from './routes/emailRoutes';
import webhookRoutes from './routes/webhookRoutes';
// Phase 3c: API Versioning, Analytics, Pagination
import analyticsRoutes from './routes/analyticsRoutes';
import { versionMiddleware } from './services/ApiVersionService';
import { metricsMiddleware } from './services/MetricsService';
// Phase 3d: Admin Dashboard, Health Checks
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
// Phase 3: Security & Monitoring
import { rateLimiters } from './middleware/rateLimitMiddleware';
import { requestLoggerMiddleware, securityEventLogger, errorLoggerMiddleware, AuditTrail } from './middleware/auditMiddleware';
import { cacheMiddleware } from './middleware/cacheMiddleware';
import swaggerDefinition from './config/swagger';
import { CSRFProtection, securityHeaderValidationMiddleware, inputSanitizationMiddleware } from './middleware/securityHardeningMiddleware';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Signature', 'X-Client-ID'],
  }));

  // Request logging
  app.use(morgan('combined', { stream: morganLogger.stream }));

  // Body parser middleware
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // Phase 3: Security & Monitoring Middleware
  // Input sanitization & header validation
  app.use(inputSanitizationMiddleware);
  app.use(securityHeaderValidationMiddleware);

  // CSRF Protection
  app.use(CSRFProtection.middleware());

  // Request logging & audit trail
  app.use(requestLoggerMiddleware);
  app.use(securityEventLogger);

  // Phase 3c: Version middleware & metrics collection
  app.use(versionMiddleware.extractVersion());
  app.use(versionMiddleware.autoAdapt());
  app.use(metricsMiddleware.collectMetrics());

  // Rate limiting - Apply to all routes
  app.use(rateLimiters.api);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Ready probe endpoint
  app.get('/ready', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // Swagger/OpenAPI Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, {
    swaggerOptions: {
      url: '/api/v1/docs',
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
    },
  }));

  // API v1 routes with specific rate limiters
  app.use('/api/v1/auth', rateLimiters.auth, authRoutes);
  app.use('/api/v1/auth/2fa', rateLimiters.auth, twoFactorRoutes);
  app.use('/api/v1/auth/email', rateLimiters.auth, emailRoutes);
  app.use('/api/v1/oauth', rateLimiters.token, tokenRoutes);
  app.use('/api/v1/clients', rateLimiters.client, clientRoutes);
  app.use('/api/v1/scopes', rateLimiters.scope, scopeRoutes);
  app.use('/api/v1/webhooks', rateLimiters.api, webhookRoutes);
  app.use('/api/v1/analytics', rateLimiters.api, analyticsRoutes);
  app.use('/api/v1/admin', rateLimiters.api, adminRoutes);
  app.use(healthRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
