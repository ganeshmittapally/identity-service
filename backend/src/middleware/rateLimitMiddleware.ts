import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Rate Limiting Middleware
 * Prevents brute force attacks and API abuse
 */

// General API limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).userId,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

// Auth endpoints limiter - Strict: 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Allow if already authenticated
    return !!(req as any).userId;
  },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: (req.body as any)?.email,
    });
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again after 15 minutes or reset your password.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

// Token endpoint limiter - Moderate: 20 requests per 15 minutes
export const tokenLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:token:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many token requests',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Token endpoint rate limit exceeded', {
      ip: req.ip,
      clientId: (req.body as any)?.client_id,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Token endpoint rate limit exceeded.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

// Client management limiter - Moderate: 30 requests per 15 minutes
export const clientLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:client:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Client endpoint rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).userId,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Client management endpoint rate limit exceeded.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

// Scope management limiter - Lenient: 50 requests per 15 minutes
export const scopeLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:scope:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Scope endpoint rate limit exceeded', {
      ip: req.ip,
      userId: (req as any).userId,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Scope endpoint rate limit exceeded.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Create custom rate limiter with flexible options
 * @param keyGenerator - Function to generate rate limit key
 * @param max - Maximum requests per window
 * @param windowMs - Time window in milliseconds
 */
export const createCustomLimiter = (
  keyGenerator: (req: any) => string,
  max: number,
  windowMs: number = 15 * 60 * 1000
) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:custom:',
    }),
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

/**
 * Rate limit by user ID instead of IP (for authenticated endpoints)
 */
export const userBasedLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:user:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    return (req as any).userId || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export all limiters as a group
export const rateLimiters = {
  api: apiLimiter,
  auth: authLimiter,
  token: tokenLimiter,
  client: clientLimiter,
  scope: scopeLimiter,
  userBased: userBasedLimiter,
  custom: createCustomLimiter,
};

export default rateLimiters;
