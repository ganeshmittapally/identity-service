import { createClient, RedisClientType } from 'redis';
import { config } from './env';
import { logger } from './logger';

let redisClient: RedisClientType;

export async function initializeRedis(): Promise<void> {
  try {
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnect max retries exceeded');
            return new Error('Redis max retries exceeded');
          }
          return retries * 100;
        },
      },
      password: config.redis.password,
      db: config.redis.db,
    });

    redisClient.on('error', (err) => logger.error('Redis Error:', err));
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('ready', () => logger.info('Redis ready'));

    await redisClient.connect();
    logger.info('Redis client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Redis:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

// Cache operations
export async function setCache(
  key: string,
  value: string | number | object,
  expirationSeconds?: number,
): Promise<void> {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (expirationSeconds) {
      await redisClient.setEx(key, expirationSeconds, stringValue);
    } else {
      await redisClient.set(key, stringValue);
    }
  } catch (error) {
    logger.error(`Failed to set cache key ${key}:`, error);
    throw error;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    logger.error(`Failed to get cache key ${key}:`, error);
    throw error;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Failed to delete cache key ${key}:`, error);
    throw error;
  }
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.error(`Failed to delete cache pattern ${pattern}:`, error);
    throw error;
  }
}

export async function expireCache(key: string, seconds: number): Promise<void> {
  try {
    await redisClient.expire(key, seconds);
  } catch (error) {
    logger.error(`Failed to expire cache key ${key}:`, error);
    throw error;
  }
}

// Rate limiting operations
export async function incrementRateLimit(
  key: string,
  windowSeconds: number,
): Promise<number> {
  try {
    const exists = await redisClient.exists(key);
    let count: number;

    if (exists === 0) {
      count = await redisClient.incr(key);
      await redisClient.expire(key, windowSeconds);
    } else {
      count = await redisClient.incr(key);
    }

    return count;
  } catch (error) {
    logger.error(`Failed to increment rate limit ${key}:`, error);
    throw error;
  }
}

export async function getRateLimitCount(key: string): Promise<number> {
  try {
    const count = await redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    logger.error(`Failed to get rate limit count ${key}:`, error);
    throw error;
  }
}

export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error(`Failed to reset rate limit ${key}:`, error);
    throw error;
  }
}

// Session/Token operations
export async function storeToken(
  tokenId: string,
  tokenData: string | object,
  expirationSeconds: number,
): Promise<void> {
  try {
    const stringValue = typeof tokenData === 'string' ? tokenData : JSON.stringify(tokenData);
    await redisClient.setEx(`token:${tokenId}`, expirationSeconds, stringValue);
  } catch (error) {
    logger.error(`Failed to store token ${tokenId}:`, error);
    throw error;
  }
}

export async function getToken<T>(tokenId: string): Promise<T | null> {
  try {
    const value = await redisClient.get(`token:${tokenId}`);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  } catch (error) {
    logger.error(`Failed to get token ${tokenId}:`, error);
    throw error;
  }
}

export async function revokeToken(tokenId: string): Promise<void> {
  try {
    await redisClient.del(`token:${tokenId}`);
  } catch (error) {
    logger.error(`Failed to revoke token ${tokenId}:`, error);
    throw error;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}
