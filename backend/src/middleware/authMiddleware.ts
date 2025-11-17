import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../types';
import { tokenService } from '../services/TokenService';
import { userModel } from '../models/User';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isAdmin?: boolean;
      token?: string;
    }
  }
}

/**
 * Authentication middleware
 * Extracts Bearer token from Authorization header and verifies it
 * Sets req.userId and req.isAdmin if token is valid
 *
 * Usage:
 * app.get('/api/protected', authMiddleware, controller.method)
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    req.token = token;

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // Get user to check admin status
    const user = await userModel.findUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('User account is inactive');
    }

    req.userId = decoded.userId;
    req.isAdmin = user.is_admin || false;

    logger.debug(`Authentication successful for user: ${decoded.userId}`);
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.error(`Authentication failed: ${(error as Error).message}`);
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

/**
 * Optional authentication middleware
 * Same as authMiddleware but doesn't throw error if token is missing
 * Sets req.userId if token is valid, otherwise continues to next middleware
 *
 * Usage:
 * app.get('/api/public', optionalAuthMiddleware, controller.method)
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      return next();
    }

    const token = authHeader.substring(7);
    req.token = token;

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);
    if (decoded && decoded.userId) {
      const user = await userModel.findUserById(decoded.userId);
      if (user && user.is_active) {
        req.userId = decoded.userId;
        req.isAdmin = user.is_admin || false;
        logger.debug(`Optional authentication successful for user: ${decoded.userId}`);
      }
    }

    next();
  } catch (error) {
    // Log error but don't throw - allow request to continue
    logger.debug(`Optional authentication skipped: ${(error as Error).message}`);
    next();
  }
}

/**
 * Admin-only middleware
 * Requires authentication and checks if user is admin
 * Must be used after authMiddleware
 *
 * Usage:
 * app.post('/api/admin/scopes', authMiddleware, adminMiddleware, controller.createScope)
 */
export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!req.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    logger.debug(`Admin access granted for user: ${req.userId}`);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Client authentication middleware
 * Authenticates OAuth clients using client_id and client_secret
 * Sets req.clientId if credentials are valid
 *
 * Usage:
 * app.post('/api/oauth/token', clientAuthMiddleware, controller.generateToken)
 */
export async function clientAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { client_id, client_secret } = req.body;

    if (!client_id || !client_secret) {
      throw new UnauthorizedError('Missing client credentials');
    }

    // TODO: Implement client authentication
    // - Query oauthClientModel for client_id
    // - Compare client_secret hash
    // - Check if client is active
    // - Set req.clientId

    logger.warn('Client authentication middleware not fully implemented');
    next();
  } catch (error) {
    next(error);
  }
}

export default authMiddleware;
