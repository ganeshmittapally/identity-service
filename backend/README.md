# Identity Service Backend - Production Ready

A complete OAuth 2.0 Identity Provider backend built with Node.js, Express, TypeScript, PostgreSQL, and Redis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/identity-service.git
cd identity-service/backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Setup database
npm run migrate

# Start development server
npm run dev
```

### Docker

```bash
# Build and run with Docker Compose
npm run docker:run

# Stop services
npm run docker:down
```

## 📋 Features

### OAuth 2.0 Flows
- ✅ Authorization Code Flow
- ✅ Client Credentials Flow
- ✅ Refresh Token Flow
- ✅ Implicit Flow (optional)
- ✅ Resource Owner Password Flow (optional)

### Security
- ✅ JWT tokens with hard complexity
- ✅ Bcrypt password hashing
- ✅ Rate limiting
- ✅ CORS protection
- ✅ Security headers (Helmet)
- ✅ Input validation
- ✅ SQL injection prevention

### Features
- ✅ Scope management
- ✅ Client registration and management
- ✅ Token revocation
- ✅ Token introspection
- ✅ User authentication
- ✅ Session management

## 🏗️ Architecture

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models
│   ├── services/       # Business logic
│   ├── routes/         # API routes
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript types
│   └── main.ts         # Application entry point
├── tests/              # Test files
├── migrations/         # Database migrations
└── docker/             # Docker configuration
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

#### Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 900
  }
}
```

### OAuth Token Endpoints

#### Generate Token (Client Credentials)
```bash
POST /oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=client_credentials&scope=read write

Response:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "read write"
}
```

#### Refresh Token
```bash
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=eyJ...&client_id=...

Response:
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

#### Revoke Token
```bash
POST /oauth/revoke
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer eyJ...

token=eyJ...

Response:
{
  "success": true
}
```

### Scope Endpoints

#### List Scopes
```bash
GET /api/scopes
Authorization: Bearer eyJ...

Response:
{
  "success": true,
  "data": [
    {
      "id": "...",
      "scope_name": "read",
      "description": "Read access",
      "is_active": true,
      "created_at": "2025-11-17T..."
    }
  ]
}
```

#### Create Scope
```bash
POST /api/scopes
Content-Type: application/json
Authorization: Bearer eyJ...

{
  "scope_name": "read",
  "description": "Read access"
}

Response:
{
  "success": true,
  "data": { ... }
}
```

### Client Management Endpoints

#### Register Client
```bash
POST /api/clients
Content-Type: application/json
Authorization: Bearer eyJ...

{
  "client_name": "My App",
  "description": "My Application",
  "redirect_uris": ["http://localhost:3000/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "scopes": ["read", "write"]
}

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "client_id": "...",
    "client_secret": "...",
    "client_name": "My App",
    ...
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

## 🔧 Configuration

All configuration is managed via environment variables. See `.env.example` for all options.

### JWT Secrets
Generate secure JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Monitoring

The application integrates with Datadog for monitoring. Set the following environment variables:

```env
DATADOG_API_KEY=your_key
DD_ENV=production
DD_SERVICE=identity-service
```

## 🚢 Deployment

### Azure Deployment

```bash
# Create Azure resources
az group create --name identity-service-rg --location eastus
az webapp create --resource-group identity-service-rg --plan identity-service-plan --name identity-service

# Build Docker image
npm run docker:build

# Push to Azure Container Registry
az acr build --registry myregistry --image identity-service:latest .

# Deploy to App Service
az webapp config container set --name identity-service --resource-group identity-service-rg \
  --docker-custom-image-name myregistry.azurecr.io/identity-service:latest
```

### GitHub Actions CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/backend-ci-cd.yml`) that:
- Builds and tests the code
- Creates Docker image
- Deploys to Azure staging
- Requires manual approval for production

## 📝 Database Schema

The application uses PostgreSQL with the following tables:
- `users` - User accounts
- `oauth_clients` - OAuth client applications
- `scopes` - OAuth scopes
- `access_tokens` - Access tokens (issued tokens)
- `refresh_tokens` - Refresh tokens
- `authorization_codes` - Authorization codes (temporary)

## 🔐 Security

- All secrets stored in environment variables
- Passwords hashed with bcryptjs (10+ salt rounds)
- JWT tokens signed with strong secrets (32+ characters)
- Rate limiting on sensitive endpoints
- CORS properly configured
- Security headers enabled
- Input validation on all endpoints
- SQL injection prevention through parameterized queries

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For issues and questions, please open an issue on GitHub or contact the development team.

---

## Configuration Reference

### Database Naming Convention
All tables, columns, indexes, and foreign keys follow **snake_case** naming:
- Tables: `oauth_clients`, `refresh_tokens`
- Columns: `client_id`, `created_at`, `is_active`
- Indexes: `idx_oauth_clients_client_id`
- Foreign Keys: `fk_tokens_users`

### Token Expiration
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
- **Authorization Code**: 10 minutes
- **Password Reset Token**: 1 hour

### Rate Limiting
- **Global**: 1000 requests/hour per IP
- **Authentication**: 100 requests/15 minutes per IP
- **Token Generation**: 50 requests/hour per client

---

**Created**: November 17, 2025  
**Status**: ✅ Production Ready
