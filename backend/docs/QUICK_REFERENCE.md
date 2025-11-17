# Backend Quick Reference Guide

## 🎯 Your Configuration at a Glance

### Database
```sql
-- Naming Convention
table_name           -- snake_case
column_name          -- snake_case
idx_table_column     -- index naming
fk_table_ref_table   -- foreign key naming
```

### JWT Secrets
```
Length: 32+ characters
Pattern: Uppercase + lowercase + numbers + special chars
Example: aB3$dE9%fG2@hI7!jK5^lM1&nO4*pQ6_rS8+tU0=vW
Storage: Environment variables only
Rotation: Every 90 days
```

### Token Expiration
```
Access Token:         15 minutes
Refresh Token:        7 days
Authorization Code:   10 minutes
Password Reset Token: 1 hour
```

### Rate Limiting
```
Global:              1000 requests/hour per IP
Authentication:      100 requests/15 minutes per IP
Token Generation:    50 requests/hour per client
Scope Operations:    100 requests/hour per user
Client Management:   200 requests/hour per user
```

---

## 🚀 Getting Started Checklist

### Week 1: Foundation
- [ ] Initialize Node.js project
- [ ] Install dependencies (see package.json template)
- [ ] Create directory structure
- [ ] Setup TypeScript configuration
- [ ] Configure environment variables
- [ ] Create database and tables
- [ ] Test database connections

### Week 2: Core Services
- [ ] Implement TokenService
- [ ] Implement ScopeService
- [ ] Implement ClientService
- [ ] Implement AuthService
- [ ] Implement OAuthFlowHandler
- [ ] Write unit tests

### Week 3: API & Routes
- [ ] Create all controllers
- [ ] Create all routes
- [ ] Implement middleware
- [ ] Create Swagger documentation
- [ ] Write integration tests

### Week 4-5: Polish & Deploy
- [ ] Security audit
- [ ] Performance optimization
- [ ] Docker configuration
- [ ] Datadog setup
- [ ] GitHub Actions workflow testing
- [ ] Production deployment

---

## 📁 Key Files to Create Next

### Priority 1 (Day 1)
```
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── main.ts
│   ├── app.ts
│   └── config/
│       ├── env.ts
│       ├── database.ts
│       └── redis.ts
```

### Priority 2 (Day 2-3)
```
backend/
├── src/
│   ├── models/ (all 5 models)
│   ├── services/ (all 5 services)
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       ├── errors.ts
│       └── responses.ts
├── migrations/ (SQL files)
└── jest.config.js
```

### Priority 3 (Day 4-7)
```
backend/
├── src/
│   ├── controllers/ (all 4 controllers)
│   ├── routes/ (all 4 route files)
│   ├── middleware/ (all 5 middleware)
│   └── guards/
├── tests/
│   ├── unit/
│   └── integration/
└── docker/
    ├── Dockerfile
    └── docker-compose.yml
```

---

## 🔑 Environment Variables Template

```env
# Application
NODE_ENV=development
PORT=3000
APP_VERSION=1.0.0

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=identity_service
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_SSL=false
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration (HARD - 32+ chars, mixed case, numbers, special chars)
JWT_SECRET=<generate-using-crypto.randomBytes(32).toString('hex')>
JWT_REFRESH_SECRET=<generate-using-crypto.randomBytes(32).toString('hex')>
JWT_EXPIRES_IN=900s
JWT_REFRESH_EXPIRES_IN=604800s

# Logging
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:4200

# Azure Deployment (Production)
AZURE_KEYVAULT_NAME=identity-service-vault
AZURE_KEYVAULT_URI=https://identity-service-vault.vault.azure.net/

# Datadog Monitoring
DATADOG_API_KEY=<your-api-key>
DATADOG_SITE=datadoghq.com
DD_ENV=development
DD_SERVICE=identity-service
DD_VERSION=1.0.0
```

---

## 📦 Package.json Scripts Template

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/src/main.js",
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "migrate": "ts-node scripts/migrate.ts",
    "migrate:test": "NODE_ENV=test npm run migrate",
    "seed": "ts-node scripts/seed.ts",
    "docker:build": "docker build -t identity-service:latest .",
    "docker:run": "docker run -p 3000:3000 identity-service:latest"
  }
}
```

---

## 🗄️ Database Setup Commands

```bash
# Create database
createdb identity_service

# Create user
createuser -P identity_user

# Grant privileges
psql -c "ALTER USER identity_user WITH CREATEDB;"
psql -d identity_service -c "GRANT ALL PRIVILEGES ON DATABASE identity_service TO identity_user;"

# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

---

## 🐳 Docker Quick Start

```bash
# Build Docker image
npm run docker:build

# Run with docker-compose
docker-compose -f docker/docker-compose.yml up

# Stop services
docker-compose -f docker/docker-compose.yml down
```

---

## 🔒 JWT Secret Generation

```bash
# Generate secure JWT secret (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3
```

---

## 📊 Datadog Integration Quick Setup

```bash
# Install Datadog APM
npm install dd-trace

# Initialize in main.ts
import tracer from 'dd-trace';
tracer.init();

# Set environment variables
DD_ENV=production
DD_SERVICE=identity-service
DD_VERSION=1.0.0
DATADOG_API_KEY=your_api_key
```

---

## 🚀 Azure Deployment Commands

```bash
# Login to Azure
az login

# Create resource group
az group create --name identity-service-rg --location eastus

# Create PostgreSQL server
az postgres server create \
  --resource-group identity-service-rg \
  --name identity-service-db \
  --admin-user postgres \
  --admin-password <secure-password> \
  --sku-name B_Gen5_2 \
  --storage-size 51200

# Create Redis cache
az redis create \
  --resource-group identity-service-rg \
  --name identity-service-cache \
  --location eastus \
  --sku Basic \
  --vm-size c0

# Create App Service
az appservice plan create \
  --name identity-service-plan \
  --resource-group identity-service-rg \
  --is-linux \
  --sku B1

az webapp create \
  --resource-group identity-service-rg \
  --plan identity-service-plan \
  --name identity-service \
  --deployment-container-image-name ghcr.io/yourorg/identity-service:latest
```

---

## 🔧 Common Commands During Development

```bash
# Watch for changes and rebuild
npm run dev

# Run tests in watch mode
npm run test:watch

# Check code quality
npm run lint

# Format code
npm run format

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test database connection
psql postgresql://identity_user@localhost:5432/identity_service

# Test Redis connection
redis-cli ping

# Check running services
docker ps

# View logs
docker logs <container-id>
```

---

## 📋 Implementation Phases Quick Reference

| Phase | Duration | Focus | Key Deliverables |
|-------|----------|-------|------------------|
| 1 | 2-3 days | Setup | Project structure, dependencies, config |
| 2 | 3-4 days | Services | Core services, database, models |
| 3 | 3-4 days | API | Controllers, routes, middleware |
| 4 | 2 days | Utils | Config, validators, helpers |
| 5 | 2-3 days | Testing | Unit tests, integration tests, coverage |
| 6 | 2 days | Security | Security audit, optimization, Docker |
| **Total** | **14-19 days** | **Complete** | **Production-ready API** |

---

## 🎯 Success Criteria

- ✅ 80%+ test coverage
- ✅ All OAuth flows working
- ✅ API documented with Swagger
- ✅ <200ms average response time
- ✅ Rate limiting enforced
- ✅ Docker image builds successfully
- ✅ GitHub Actions CI/CD works
- ✅ Datadog monitoring active
- ✅ Azure deployment ready
- ✅ Zero critical security issues

---

## 📞 Support & Resources

### Documentation References
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)

### Tools Used
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Server**: Express.js
- **Testing**: Jest
- **Database**: PostgreSQL
- **Cache**: Redis
- **Monitoring**: Datadog
- **CI/CD**: GitHub Actions
- **Deployment**: Azure App Service

### Helpful Commands
```bash
# Update all dependencies
npm update

# Check for outdated packages
npm outdated

# Audit dependencies
npm audit

# Clean install
rm -rf node_modules && npm ci
```

---

## ✨ You're Ready to Start!

All configuration is locked in and documented. Begin with Phase 1, Step 1:
**Initialize Node.js Project**

Reference this guide whenever you need quick answers!

Last Updated: November 17, 2025
Status: ✅ Ready for Implementation
