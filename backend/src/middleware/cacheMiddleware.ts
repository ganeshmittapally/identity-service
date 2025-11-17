import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Caching Middleware & Service
 * Redis-backed caching for frequently accessed data
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
  keyPrefix?: string;
}

/**
 * Generic cache get method
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      logger.debug('Cache hit', { key });
      return JSON.parse(cached) as T;
    }
    logger.debug('Cache miss', { key });
    return null;
  } catch (error) {
    logger.error('Cache get error', { key, error });
    return null;
  }
}

/**
 * Generic cache set method
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttl: number = 300
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    logger.debug('Cache set', { key, ttl });
  } catch (error) {
    logger.error('Cache set error', { key, error });
  }
}

/**
 * Delete cache key
 */
export async function deleteFromCache(key: string): Promise<void> {
  try {
    await redis.del(key);
    logger.debug('Cache deleted', { key });
  } catch (error) {
    logger.error('Cache delete error', { key, error });
  }
}

/**
 * Delete cache keys by pattern
 */
export async function deleteFromCacheByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug('Cache pattern deleted', { pattern, keysDeleted: keys.length });
    }
  } catch (error) {
    logger.error('Cache pattern delete error', { pattern, error });
  }
}

/**
 * HTTP Response caching middleware
 * Caches GET request responses based on URL
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const { ttl = 300, keyPrefix = 'cache:http:' } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}${req.originalUrl}`;

    try {
      // Check if data is in cache
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        logger.debug('Returning cached response', { url: req.originalUrl });
        res.set('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedData));
      }

      // Intercept response.json to cache it
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // Cache the response
        setInCache(cacheKey, body, ttl);
        res.set('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      next();
    }
  };
}

/**
 * Scope caching service
 * Caches frequently accessed scopes
 */
export const scopeCache = {
  getAllKey: 'cache:scopes:all',
  getSingleKey: (scopeId: string) => `cache:scope:${scopeId}`,
  getScopeByNameKey: (scopeName: string) => `cache:scope:name:${scopeName}`,

  async getAll() {
    return getFromCache('cache:scopes:all');
  },

  async setAll(data: any, ttl = 600) {
    return setInCache('cache:scopes:all', data, ttl);
  },

  async getSingle(scopeId: string) {
    return getFromCache(this.getSingleKey(scopeId));
  },

  async setSingle(scopeId: string, data: any, ttl = 600) {
    return setInCache(this.getSingleKey(scopeId), data, ttl);
  },

  async getScopeByName(scopeName: string) {
    return getFromCache(this.getScopeByNameKey(scopeName));
  },

  async setScopeByName(scopeName: string, data: any, ttl = 600) {
    return setInCache(this.getScopeByNameKey(scopeName), data, ttl);
  },

  async invalidateAll() {
    await deleteFromCache('cache:scopes:all');
    await deleteFromCacheByPattern('cache:scope:*');
  },

  async invalidateSingle(scopeId: string) {
    await deleteFromCache(this.getSingleKey(scopeId));
  },
};

/**
 * User caching service
 * Caches user profiles and data
 */
export const userCache = {
  getUserKey: (userId: string) => `cache:user:${userId}`,
  getUserByEmailKey: (email: string) => `cache:user:email:${email}`,

  async getUser(userId: string) {
    return getFromCache(this.getUserKey(userId));
  },

  async setUser(userId: string, data: any, ttl = 900) {
    return setInCache(this.getUserKey(userId), data, ttl);
  },

  async getUserByEmail(email: string) {
    return getFromCache(this.getUserByEmailKey(email));
  },

  async setUserByEmail(email: string, data: any, ttl = 900) {
    return setInCache(this.getUserByEmailKey(email), data, ttl);
  },

  async invalidateUser(userId: string) {
    await deleteFromCache(this.getUserKey(userId));
  },

  async invalidateUserByEmail(email: string) {
    await deleteFromCache(this.getUserByEmailKey(email));
  },

  async invalidateAllForUser(userId: string, email: string) {
    await Promise.all([
      deleteFromCache(this.getUserKey(userId)),
      deleteFromCache(this.getUserByEmailKey(email)),
    ]);
  },
};

/**
 * OAuth Client caching service
 * Caches client information and metadata
 */
export const clientCache = {
  getClientKey: (clientId: string) => `cache:client:${clientId}`,
  getUserClientsKey: (userId: string) => `cache:user:${userId}:clients`,
  getClientBySecretKey: (clientSecret: string) => `cache:client:secret:${clientSecret}`,

  async getClient(clientId: string) {
    return getFromCache(this.getClientKey(clientId));
  },

  async setClient(clientId: string, data: any, ttl = 600) {
    return setInCache(this.getClientKey(clientId), data, ttl);
  },

  async getUserClients(userId: string) {
    return getFromCache(this.getUserClientsKey(userId));
  },

  async setUserClients(userId: string, data: any, ttl = 600) {
    return setInCache(this.getUserClientsKey(userId), data, ttl);
  },

  async getClientBySecret(clientSecret: string) {
    return getFromCache(this.getClientBySecretKey(clientSecret));
  },

  async setClientBySecret(clientSecret: string, data: any, ttl = 600) {
    return setInCache(this.getClientBySecretKey(clientSecret), data, ttl);
  },

  async invalidateClient(clientId: string, userId: string, clientSecret?: string) {
    const deletions = [
      deleteFromCache(this.getClientKey(clientId)),
      deleteFromCache(this.getUserClientsKey(userId)),
    ];
    if (clientSecret) {
      deletions.push(deleteFromCache(this.getClientBySecretKey(clientSecret)));
    }
    await Promise.all(deletions);
  },

  async invalidateUserClients(userId: string) {
    await deleteFromCache(this.getUserClientsKey(userId));
  },
};

/**
 * Authorization code caching (short-lived)
 * Used for OAuth authorization code grant flow
 */
export const authCodeCache = {
  getCodeKey: (code: string) => `cache:auth_code:${code}`,

  async getCode(code: string) {
    return getFromCache(this.getCodeKey(code));
  },

  async setCode(code: string, data: any, ttl = 600) {
    // Authorization codes typically expire in 10 minutes
    return setInCache(this.getCodeKey(code), data, ttl);
  },

  async deleteCode(code: string) {
    return deleteFromCache(this.getCodeKey(code));
  },
};

/**
 * Refresh token caching
 * Track active refresh tokens
 */
export const refreshTokenCache = {
  getTokenKey: (refreshToken: string) => `cache:refresh_token:${refreshToken}`,
  getUserTokensKey: (userId: string) => `cache:user:${userId}:refresh_tokens`,

  async getToken(refreshToken: string) {
    return getFromCache(this.getTokenKey(refreshToken));
  },

  async setToken(refreshToken: string, data: any, ttl = 604800) {
    // Refresh tokens typically expire in 7 days
    return setInCache(this.getTokenKey(refreshToken), data, ttl);
  },

  async deleteToken(refreshToken: string) {
    return deleteFromCache(this.getTokenKey(refreshToken));
  },

  async addToUserTokens(userId: string, refreshToken: string) {
    const key = this.getUserTokensKey(userId);
    const tokens = (await getFromCache<string[]>(key)) || [];
    tokens.push(refreshToken);
    await setInCache(key, tokens, 604800);
  },

  async getUserTokens(userId: string) {
    return getFromCache<string[]>(this.getUserTokensKey(userId));
  },

  async invalidateUserTokens(userId: string) {
    const tokens = await this.getUserTokens(userId);
    if (tokens) {
      await Promise.all(tokens.map((t) => this.deleteToken(t)));
    }
    await deleteFromCache(this.getUserTokensKey(userId));
  },
};

/**
 * Export all cache services
 */
export const cacheService = {
  generic: { get: getFromCache, set: setInCache, delete: deleteFromCache, deletePattern: deleteFromCacheByPattern },
  scope: scopeCache,
  user: userCache,
  client: clientCache,
  authCode: authCodeCache,
  refreshToken: refreshTokenCache,
};

export default cacheService;
