import dotenv from 'dotenv';

dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  appVersion: string;
  apiUrl: string;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
    poolMin: number;
    poolMax: number;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  cors: {
    origin: string;
  };
  logging: {
    level: string;
  };
  datadog: {
    enabled: boolean;
    apiKey?: string;
    siteUrl?: string;
    hostname?: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authWindowMs: number;
    authMaxRequests: number;
  };
}

function validateConfig(): Config {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_HOST',
    'DATABASE_NAME',
    'REDIS_HOST'
  ];

  const missing = requiredVars.filter(variable => !process.env[variable]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    appVersion: process.env.APP_VERSION || '1.0.0',
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    database: {
      host: process.env.DATABASE_HOST!,
      port: parseInt(process.env.DATABASE_PORT || '5432', 10),
      name: process.env.DATABASE_NAME!,
      user: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      ssl: process.env.DATABASE_SSL === 'true',
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '5', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '20', 10)
    },
    redis: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInt(process.env.REDIS_DB || '0', 10)
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '900s',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '604800s'
    },
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:4200'
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info'
    },
    datadog: {
      enabled: process.env.DATADOG_ENABLED === 'true',
      apiKey: process.env.DATADOG_API_KEY,
      siteUrl: process.env.DATADOG_SITE_URL || 'https://api.datadoghq.com',
      hostname: process.env.DATADOG_HOSTNAME
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
      authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
      authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS || '100', 10)
    }
  };
}

export const config = validateConfig();
