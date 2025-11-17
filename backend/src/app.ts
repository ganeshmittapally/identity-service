import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { logger, morganLogger } from './config/logger';
import { AppError } from './types';

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

  // API v1 routes (placeholder - will be implemented later)
  app.use('/api/v1/auth', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Auth routes coming soon' });
  });

  app.use('/api/v1/oauth', (req: Request, res: Response) => {
    res.status(200).json({ message: 'OAuth routes coming soon' });
  });

  app.use('/api/v1/clients', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Client routes coming soon' });
  });

  app.use('/api/v1/scopes', (req: Request, res: Response) => {
    res.status(200).json({ message: 'Scope routes coming soon' });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    });
  });

  // Error handling middleware
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', err);

    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.name,
        message: err.message,
        statusCode: err.statusCode,
        ...(config.nodeEnv === 'development' && { stack: err.stack }),
      });
    }

    const error = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({
      error: 'Internal Server Error',
      message: config.nodeEnv === 'development' ? error.message : 'An unexpected error occurred',
      statusCode: 500,
      ...(config.nodeEnv === 'development' && { stack: error.stack }),
    });
  });

  return app;
}
