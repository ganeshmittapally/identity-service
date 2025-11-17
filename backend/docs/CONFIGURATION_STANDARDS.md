# Configuration Standards & Implementation Guide

## 📋 Executive Summary
This document defines the configuration standards for the Identity Service backend based on the answers provided.

---

## 1. Database Configuration

### Naming Conventions
```sql
-- Tables (snake_case)
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    redirect_uris TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (idx_{table}_{column})
CREATE INDEX idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX idx_oauth_clients_created_at ON oauth_clients(created_at);

-- Foreign Keys (fk_{table}_{referenced_table})
ALTER TABLE refresh_tokens 
ADD CONSTRAINT fk_refresh_tokens_users 
FOREIGN KEY (user_id) REFERENCES users(id);
```

### Naming Guidelines
| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case | `oauth_clients`, `refresh_tokens`, `access_tokens` |
| Columns | snake_case | `client_id`, `created_at`, `is_active` |
| Indexes | idx_{table}_{column} | `idx_users_email`, `idx_tokens_user_id` |
| Foreign Keys | fk_{table}_{referenced_table} | `fk_tokens_users`, `fk_scopes_clients` |
| Primary Keys | id | UUID type with default gen_random_uuid() |
| Timestamps | created_at, updated_at | TIMESTAMP with DEFAULT CURRENT_TIMESTAMP |

### Implementation Checklist
- [ ] All tables use snake_case naming
- [ ] All columns use snake_case naming
- [ ] All indexes follow idx_{table}_{column} pattern
- [ ] All foreign keys follow fk_{table}_{referenced_table} pattern
- [ ] All tables have id (UUID), created_at, updated_at columns
- [ ] Soft deletes use deleted_at column

---

## 2. JWT Configuration (Hard Complexity)

### Secret Generation & Management

#### Generation Process
```typescript
// src/utils/jwt.util.ts
import crypto from 'crypto';

export function generateJWTSecret(length: number = 32): string {
    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(length);
    return randomBytes.toString('hex');
}

// Must contain: uppercase, lowercase, numbers, special characters
export function validateJWTSecretComplexity(secret: string): boolean {
    const hasUppercase = /[A-Z]/.test(secret);
    const hasLowercase = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret);
    const isMinLength = secret.length >= 32;

    return hasUppercase && hasLowercase && hasNumbers && hasSpecialChars && isMinLength;
}
```

#### Environment Variables
```env
# .env (NEVER commit this file!)
JWT_SECRET=aB3$dE9%fG2@hI7!jK5^lM1&nO4*pQ6_rS8+tU0=vW
JWT_REFRESH_SECRET=xY2#zA4$bC6@dE8%fG0!hI2^jK4&lM6*nO8_pQ0+rS2=
JWT_EXPIRES_IN=900s (15 minutes)
JWT_REFRESH_EXPIRES_IN=604800s (7 days)
```

#### Secret Requirements Checklist
- [ ] Minimum 32 characters long
- [ ] Contains uppercase letters (A-Z)
- [ ] Contains lowercase letters (a-z)
- [ ] Contains numbers (0-9)
- [ ] Contains special characters (!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?)
- [ ] Stored in .env file (never in code)
- [ ] Different secret for refresh tokens
- [ ] Rotated every 90 days
- [ ] Generated using `crypto.randomBytes()` for initial setup

### JWT Token Structure
```typescript
// Access Token Payload (15 minutes)
{
  sub: "user-id",           // Subject (user ID)
  client_id: "client-id",   // OAuth client ID
  scopes: ["read", "write"], // Granted scopes
  iat: 1700234400,           // Issued at
  exp: 1700235300,           // Expires at (900 seconds later)
  iss: "identity-service",   // Issuer
  aud: "api"                 // Audience
}

// Refresh Token Payload (7 days)
{
  sub: "user-id",
  token_type: "refresh",
  client_id: "client-id",
  iat: 1700234400,
  exp: 1700839200,           // 604800 seconds (7 days) later
  iss: "identity-service"
}
```

### JWT Signing & Verification
```typescript
import jwt from 'jsonwebtoken';

export class JWTService {
    private accessTokenSecret: string;
    private refreshTokenSecret: string;

    constructor() {
        this.accessTokenSecret = process.env.JWT_SECRET!;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
        
        // Validate on initialization
        if (!this.validateSecrets()) {
            throw new Error('JWT secrets do not meet complexity requirements');
        }
    }

    generateAccessToken(payload: any): string {
        return jwt.sign(payload, this.accessTokenSecret, {
            expiresIn: '15m',
            algorithm: 'HS256',
            issuer: 'identity-service',
            audience: 'api'
        });
    }

    generateRefreshToken(payload: any): string {
        return jwt.sign(payload, this.refreshTokenSecret, {
            expiresIn: '7d',
            algorithm: 'HS256',
            issuer: 'identity-service'
        });
    }

    verifyAccessToken(token: string): any {
        try {
            return jwt.verify(token, this.accessTokenSecret, {
                algorithms: ['HS256'],
                issuer: 'identity-service',
                audience: 'api'
            });
        } catch (error) {
            throw new UnauthorizedException('Invalid access token');
        }
    }

    private validateSecrets(): boolean {
        return validateJWTSecretComplexity(this.accessTokenSecret) &&
               validateJWTSecretComplexity(this.refreshTokenSecret);
    }
}
```

---

## 3. Token Expiration Times

### Standard Token Lifetimes
| Token Type | Expiration | Use Case | Refresh |
|-----------|-----------|----------|---------|
| Access Token | 15 minutes | API requests | Via refresh token |
| Refresh Token | 7 days | Get new access token | Manual re-login |
| Authorization Code | 10 minutes | Exchange for token | Cannot refresh |
| Password Reset Token | 1 hour | Password reset link | Cannot refresh |

### Implementation
```typescript
// src/config/constants.ts
export const TOKEN_EXPIRATION = {
    ACCESS_TOKEN: '15m',           // 900 seconds
    REFRESH_TOKEN: '7d',           // 604800 seconds
    AUTHORIZATION_CODE: '10m',     // 600 seconds
    PASSWORD_RESET_TOKEN: '1h',    // 3600 seconds
    SESSION_TIMEOUT: '24h'         // 86400 seconds
};

export const TOKEN_EXPIRATION_SECONDS = {
    ACCESS_TOKEN: 15 * 60,           // 900
    REFRESH_TOKEN: 7 * 24 * 60 * 60, // 604800
    AUTHORIZATION_CODE: 10 * 60,     // 600
    PASSWORD_RESET_TOKEN: 60 * 60,   // 3600
    SESSION_TIMEOUT: 24 * 60 * 60    // 86400
};
```

### Checking Token Expiration
```typescript
export function isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
}

export function getTokenExpiresAt(expiresInSeconds: number): Date {
    return new Date(Date.now() + expiresInSeconds * 1000);
}

export function getTimeUntilExpiry(expiresAt: Date): number {
    return Math.floor((expiresAt.getTime() - Date.now()) / 1000);
}
```

---

## 4. Rate Limiting Thresholds

### Rate Limit Configuration
```typescript
// src/config/rateLimitConfig.ts
export const RATE_LIMIT_CONFIG = {
    // Global rate limit
    global: {
        windowMs: 60 * 60 * 1000,  // 1 hour
        max: 1000,                  // 1000 requests per hour per IP
        message: 'Too many requests from this IP, please try again later.'
    },

    // Authentication endpoints (stricter)
    auth: {
        windowMs: 15 * 60 * 1000,  // 15 minutes
        max: 100,                   // 100 attempts per 15 minutes
        message: 'Too many authentication attempts, please try again later.'
    },

    // Token generation (stricter)
    tokenGeneration: {
        windowMs: 60 * 60 * 1000,  // 1 hour
        max: 50,                    // 50 tokens per hour per client
        message: 'Too many token generation requests.'
    },

    // Scope operations (moderate)
    scopeOperations: {
        windowMs: 60 * 60 * 1000,  // 1 hour
        max: 100,                   // 100 operations per hour
        message: 'Too many scope operations.'
    },

    // Client management (moderate)
    clientManagement: {
        windowMs: 60 * 60 * 1000,  // 1 hour
        max: 200,                   // 200 operations per hour
        message: 'Too many client management requests.'
    }
};
```

### Middleware Implementation
```typescript
// src/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { RATE_LIMIT_CONFIG } from '../config/rateLimitConfig';

export const globalLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:global:'
    }),
    windowMs: RATE_LIMIT_CONFIG.global.windowMs,
    max: RATE_LIMIT_CONFIG.global.max,
    message: RATE_LIMIT_CONFIG.global.message,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.user?.role === 'admin'  // Exempt admins
});

export const authLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:auth:'
    }),
    windowMs: RATE_LIMIT_CONFIG.auth.windowMs,
    max: RATE_LIMIT_CONFIG.auth.max,
    message: RATE_LIMIT_CONFIG.auth.message,
    skipSuccessfulRequests: true  // Don't count successful auth
});

export const tokenLimiter = rateLimit({
    store: new RedisStore({
        client: redisClient,
        prefix: 'rl:token:'
    }),
    windowMs: RATE_LIMIT_CONFIG.tokenGeneration.windowMs,
    max: RATE_LIMIT_CONFIG.tokenGeneration.max,
    keyGenerator: (req) => req.body.client_id // Rate limit by client
});
```

### Applying Rate Limiting
```typescript
// src/routes/authRoutes.ts
import express from 'express';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { authController } from '../controllers/authController';

const router = express.Router();

router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
router.post('/forgot-password', authLimiter, authController.forgotPassword);

export default router;
```

---

## 5. Production Deployment - Azure

### Azure Services Required
1. **Azure App Service** - Host backend
2. **Azure Database for PostgreSQL** - Database
3. **Azure Cache for Redis** - Caching layer
4. **Azure Container Registry** - Docker image storage
5. **Azure Key Vault** - Secrets management
6. **Application Insights** - Monitoring

### Environment Configuration for Azure
```env
# .env.production
NODE_ENV=production
PORT=8080

# Azure PostgreSQL
DATABASE_URL=postgresql://user:password@server.postgres.database.azure.com:5432/identity_service
DATABASE_SSL=true
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Azure Redis
REDIS_URL=redis://:password@cache-name.redis.cache.windows.net:6379
REDIS_SSL=true

# Azure Key Vault
AZURE_KEYVAULT_NAME=identity-service-vault
AZURE_KEYVAULT_URI=https://identity-service-vault.vault.azure.net/

# Monitoring
APPINSIGHTS_INSTRUMENTATION_KEY=<your-key>

# API
API_URL=https://identity-service.azurewebsites.net
FRONTEND_URL=https://identity-service-admin.azurewebsites.net
```

### Dockerfile for Azure
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 8080
ENV NODE_ENV=production

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
```

### Azure Deployment Checklist
- [ ] Azure App Service created
- [ ] PostgreSQL database created
- [ ] Redis cache created
- [ ] Key Vault created with secrets
- [ ] Container Registry created
- [ ] Docker image built and pushed
- [ ] App Service configured for container deployment
- [ ] Environment variables configured in App Service
- [ ] Application Insights enabled
- [ ] SSL certificate configured
- [ ] Monitoring and alerting enabled

---

## 6. CI/CD Pipeline - GitHub Actions

### YAML Workflow File
See `GITHUB_ACTIONS_CI_CD.yaml` for complete implementation.

**Key Stages:**
1. Trigger: Push to `main` or `develop`
2. Build: Install dependencies, compile TypeScript
3. Test: Run unit & integration tests
4. Lint: ESLint and Prettier check
5. Deploy Staging: Deploy to Azure staging
6. Manual Approval
7. Deploy Production: Deploy to Azure production

### Workflow Triggers
- [ ] Push to main branch
- [ ] Push to develop branch
- [ ] Manual trigger (workflow_dispatch)
- [ ] Pull requests (optional - for pre-merge checks)

---

## 7. Monitoring & Alerting - Datadog

### Datadog Configuration

#### Metrics to Monitor
```
- HTTP request latency (p50, p95, p99)
- Error rate (4xx, 5xx)
- Token generation rate
- Database query latency
- Redis cache hit ratio
- API availability
- Authentication success rate
```

#### Alerts to Configure
```
1. High Error Rate
   - Condition: error_rate > 5% for 5 minutes
   - Action: Notify DevOps team

2. High Latency
   - Condition: request_latency_p99 > 1000ms for 5 minutes
   - Action: Notify DevOps team

3. Database Connection Pool Exhausted
   - Condition: db_pool_connections > 90% of max
   - Action: Critical alert

4. Redis Cache Failure
   - Condition: redis_connection_errors > 0
   - Action: Critical alert

5. Authentication Failures
   - Condition: auth_failure_rate > 20%
   - Action: Notify security team
```

#### Datadog Integration
```typescript
// src/config/datadog.ts
import { init, client } from '@datadog/browser-rum';

export function initializeDatadog() {
    init({
        applicationId: process.env.DATADOG_APP_ID!,
        clientToken: process.env.DATADOG_CLIENT_TOKEN!,
        site: 'datadoghq.com',
        service: 'identity-service',
        env: process.env.NODE_ENV,
        version: process.env.APP_VERSION,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input'
    });
}

export function captureMetric(name: string, value: number, tags: string[] = []) {
    client.addRumGlobalContext('metrics', {
        [name]: value
    });
}
```

#### Custom Logging with Datadog
```typescript
// src/utils/logger.ts
import winston from 'winston';
import DatadogTransport from 'winston-datadog';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'identity-service' },
    transports: [
        new DatadogTransport({
            apiKey: process.env.DATADOG_API_KEY!,
            hostname: 'identity-service',
            service: 'identity-service',
            env: process.env.NODE_ENV,
            ddsource: 'nodejs'
        })
    ]
});
```

---

## 8. Backup Strategy

### Status: Not Required
As requested, backup strategy is not implemented. However, recommendations for future:
- Azure Database for PostgreSQL has built-in backup retention (7-35 days)
- Automated backups available in Azure Portal
- Point-in-time restore available
- Geo-redundant backup option available

---

## 📋 Implementation Checklist

### Database Setup
- [ ] All tables use snake_case naming
- [ ] All indexes follow naming convention
- [ ] All foreign keys properly configured
- [ ] Soft delete columns added where needed

### JWT Configuration
- [ ] JWT secrets meet complexity requirements (32+ chars)
- [ ] Separate secrets for access and refresh tokens
- [ ] Secrets stored in environment variables
- [ ] Secret rotation scheduled every 90 days
- [ ] Token expiration times configured

### Rate Limiting
- [ ] Global rate limiter configured
- [ ] Auth endpoints rate limiter configured
- [ ] Token generation rate limiter configured
- [ ] Redis backend for rate limiting
- [ ] Rate limit responses include `Retry-After` header

### Azure Deployment
- [ ] All Azure services created
- [ ] Docker image builds successfully
- [ ] Dockerfile optimized for Azure
- [ ] Environment variables configured
- [ ] SSL/TLS configured
- [ ] Monitoring enabled

### CI/CD Pipeline
- [ ] GitHub Actions workflow created
- [ ] Build stage tested
- [ ] Test stage configured
- [ ] Deploy to staging automated
- [ ] Deploy to production manual approval
- [ ] Rollback procedure documented

### Monitoring & Datadog
- [ ] Datadog account setup complete
- [ ] Application ID and client token obtained
- [ ] Custom metrics configured
- [ ] Alerts configured
- [ ] Dashboard created
- [ ] Log aggregation working

---

## Next Steps
1. Generate JWT secrets using provided utility
2. Set up Azure services
3. Create GitHub Actions workflow
4. Configure Datadog integration
5. Test deployment pipeline
