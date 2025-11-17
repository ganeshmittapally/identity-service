import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { logger, morganLogger } from './config/logger';
import { AppError } from './types';
import authRoutes from './routes/authRoutes';
import tokenRoutes from './routes/tokenRoutes';
import clientRoutes from './routes/clientRoutes';
import scopeRoutes from './routes/scopeRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Request logging
  app.use(morgan('combined', { stream: morganLogger.stream }));

  // Body parser middleware
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', extended: true }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  // Ready probe endpoint
  app.get('/ready', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  });

  // API v1 routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/oauth', tokenRoutes);
  app.use('/api/v1/clients', clientRoutes);
  app.use('/api/v1/scopes', scopeRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}
