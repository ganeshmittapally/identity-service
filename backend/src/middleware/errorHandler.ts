import { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../types';
import { logger } from '../config/logger';

/**
 * Global error handler middleware
 * Catches all errors and returns consistent error response
 * Must be the last middleware registered in Express app
 *
 * Usage:
 * app.use(errorHandler);
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Log error
  logger.error(`Error: ${err.message}`, {
    error: err,
    path: req.path,
    method: req.method,
    userId: (req as any).userId,
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: err.message,
      errors: (err as any).errors,
    });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: err.message,
    });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({
      status: 'error',
      code: 'FORBIDDEN',
      message: err.message,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: err.message,
    });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({
      status: 'error',
      code: 'CONFLICT',
      message: err.message,
    });
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(400).json({
      status: 'error',
      code: 'BAD_REQUEST',
      message: err.message,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode || 500).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      status: 'error',
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
    });
    return;
  }

  // Handle generic errors
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

/**
 * Not found handler middleware
 * Handles 404 for routes that don't exist
 * Should be added after all routes
 *
 * Usage:
 * app.use(notFoundHandler);
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    status: 'error',
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.path}`,
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 *
 * Usage:
 * router.post('/path', wrap(controller.method))
 */
export function wrap(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default errorHandler;
