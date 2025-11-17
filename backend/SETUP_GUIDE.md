# Identity Service Backend - Setup Guide

## Quick Start (Docker Compose)

The fastest way to get started is using Docker Compose:

```bash
cd backend
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- Identity Service application

Access the service at: `http://localhost:3000`

## Local Development Setup

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=identity_service
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-32-char-secret-here-with-special-chars123!@#
JWT_REFRESH_SECRET=your-32-char-refresh-secret-with-special456!@#
```

### Step 3: Database Setup

Create the database and run migrations:

```bash
# Create database
createdb -U postgres identity_service

# Run migrations
npx pg-migrate up
```

Or manually run the SQL migration:

```bash
psql -U postgres -d identity_service -f db/migrations/001_initial_schema.sql
psql -U postgres -d identity_service -f db/seeds/001_initial_data.sql
```

### Step 4: Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Step 5: Verify Installation

Check health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration modules
│   │   ├── env.ts       # Environment variable loader
│   │   ├── database.ts  # PostgreSQL pool management
│   │   ├── redis.ts     # Redis client & operations
│   │   └── logger.ts    # Winston logger setup
│   ├── models/          # Database models
│   │   ├── User.ts
│   │   ├── OAuthClient.ts
│   │   ├── Scope.ts
│   │   ├── AccessToken.ts
│   │   ├── RefreshToken.ts
│   │   └── AuthorizationCode.ts
│   ├── services/        # Business logic layer
│   │   ├── TokenService.ts
│   │   ├── AuthService.ts
│   │   ├── ClientService.ts
│   │   ├── ScopeService.ts
│   │   └── OAuthService.ts
│   ├── controllers/     # Route handlers
│   ├── routes/          # Route definitions
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript interfaces
│   ├── app.ts          # Express app setup
│   └── main.ts         # Server entry point
├── db/
│   ├── migrations/      # SQL migration files
│   └── seeds/           # Seed data
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Docker image definition
├── package.json         # NPM dependencies
├── tsconfig.json        # TypeScript configuration
└── jest.config.js       # Jest test configuration
```

## Available Commands

### Development

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format

# Format and check
npm run format:check
```

### Database

```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Reset database (migrations down then up)
npm run db:reset
```

### Docker

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Docker Compose up
docker-compose up -d

# Docker Compose down
docker-compose down
```

## Environment Variables Reference

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `NODE_ENV` | string | No | Environment: development, staging, production (default: development) |
| `PORT` | number | No | Server port (default: 3000) |
| `DATABASE_HOST` | string | Yes | PostgreSQL hostname |
| `DATABASE_PORT` | number | No | PostgreSQL port (default: 5432) |
| `DATABASE_NAME` | string | Yes | Database name |
| `DATABASE_USER` | string | No | Database user (default: postgres) |
| `DATABASE_PASSWORD` | string | No | Database password (default: postgres) |
| `REDIS_HOST` | string | Yes | Redis hostname |
| `REDIS_PORT` | number | No | Redis port (default: 6379) |
| `REDIS_PASSWORD` | string | No | Redis password |
| `REDIS_DB` | number | No | Redis database number (default: 0) |
| `JWT_SECRET` | string | Yes | JWT signing secret (32+ chars, mixed case, numbers, special) |
| `JWT_REFRESH_SECRET` | string | Yes | JWT refresh secret (32+ chars, mixed case, numbers, special) |
| `JWT_EXPIRES_IN` | string | No | Access token expiry (default: 900s = 15 minutes) |
| `JWT_REFRESH_EXPIRES_IN` | string | No | Refresh token expiry (default: 604800s = 7 days) |
| `CORS_ORIGIN` | string | No | CORS allowed origin (default: http://localhost:4200) |
| `LOG_LEVEL` | string | No | Log level (default: info) |
| `DATADOG_ENABLED` | boolean | No | Enable Datadog integration |
| `DATADOG_API_KEY` | string | No | Datadog API key |
| `RATE_LIMIT_WINDOW_MS` | number | No | Rate limit window in ms (default: 3600000 = 1 hour) |
| `RATE_LIMIT_MAX_REQUESTS` | number | No | Max requests per window (default: 1000) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | number | No | Auth rate limit window (default: 900000 = 15 min) |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | number | No | Auth max requests (default: 100) |

## Database Setup Details

### Tables Created

1. **users** - User accounts
2. **oauth_clients** - OAuth 2.0 client applications
3. **scopes** - OAuth scopes/permissions
4. **access_tokens** - Short-lived access tokens
5. **refresh_tokens** - Long-lived refresh tokens
6. **authorization_codes** - Authorization codes for OAuth flow

### Naming Convention

All database objects use **snake_case**:
- Table names: `users`, `oauth_clients`
- Column names: `user_id`, `password_hash`, `is_active`
- Indexes: `idx_users_email`, `idx_access_tokens_token_hash`

## Testing

### Unit Tests

Unit tests cover individual functions and services:

```bash
npm run test:unit
```

### Integration Tests

Integration tests verify complete flows:

```bash
npm run test:integration
```

### Coverage

Minimum coverage requirements (per jest.config.js):
- Statements: 75%
- Functions: 75%
- Lines: 75%
- Branches: 70%

## Troubleshooting

### Port Already in Use

If port 3000 is already in use:

```bash
# Use different port
PORT=3001 npm run dev

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000    # Windows
```

### Database Connection Failed

1. Verify PostgreSQL is running
2. Check database credentials in `.env`
3. Ensure database exists: `createdb -U postgres identity_service`
4. Check PostgreSQL logs

### Redis Connection Failed

1. Verify Redis is running
2. Check Redis credentials in `.env`
3. Test connection: `redis-cli ping`

### TypeScript Errors

All TypeScript errors are expected before `npm install`:

```bash
npm install
npm run build  # Should complete without errors
```

## Production Deployment

### Azure Deployment

1. Create Azure resources:
   ```bash
   # App Service
   az appservice plan create --name IdentityServicePlan --resource-group MyResourceGroup --sku B2
   
   # Database
   az postgres server create --name my-db-server --resource-group MyResourceGroup
   
   # Redis Cache
   az redis create --name my-redis-cache --resource-group MyResourceGroup
   ```

2. Configure environment variables in App Service settings

3. Deploy:
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

```bash
# Build image
npm run docker:build

# Tag for registry
docker tag identity-service:latest myregistry.azurecr.io/identity-service:latest

# Push to Azure Container Registry
az acr push --registry myregistry --image identity-service:latest

# Deploy to App Service
az webapp deployment container config --name myapp --resource-group MyResourceGroup --enable-cd
```

## Security Checklist

- [ ] JWT secrets are strong (32+ chars, mixed case, numbers, special chars)
- [ ] All environment secrets are in `.env` (not in git)
- [ ] Database credentials are unique per environment
- [ ] HTTPS is enabled in production
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] Input validation is implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled (via Helmet)
- [ ] Monitoring and logging configured

## Support & Documentation

- API Documentation: See `README.md`
- Architecture: See `IMPLEMENTATION_ANALYSIS.md`
- Configuration: See `CONFIGURATION_STANDARDS.md`
- Monitoring: See `DATADOG_MONITORING.md`

## License

Proprietary - Identity Service Backend
