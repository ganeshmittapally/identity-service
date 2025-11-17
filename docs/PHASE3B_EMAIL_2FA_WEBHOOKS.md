# Phase 3b: Email Notifications, 2FA & Webhooks - Implementation Guide

**Created**: November 17, 2025  
**Phase**: 3b (High-Priority User Features)  
**Status**: ✅ Complete  

---

## Overview

Phase 3b adds three enterprise-grade features to the Identity Service:
1. **Email Notification System** - Centralized email delivery with templates and retry logic
2. **Two-Factor Authentication (2FA)** - TOTP-based security with backup codes and trusted devices
3. **Webhook Support** - Event-driven integrations with automatic retry

### Architecture
- **Service Layer**: `src/services/` - Business logic
- **Controllers**: `src/controllers/` - HTTP request handling
- **Routes**: `src/routes/` - Endpoint definitions
- **Middleware**: `src/middleware/` - Request/response processing

---

## 1. Email Notifications

### Overview
The `EmailService` provides centralized email delivery with queuing, retry logic, and template support.

### File: `src/services/EmailService.ts`

**Configuration** (in `config/env.ts`):
```typescript
// Email Provider (smtp or sendgrid)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SENDGRID_API_KEY=sg.xxxxx

// SendGrid Alternative
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=sg.xxxxx

// Email Configuration
EMAIL_FROM=noreply@identity-service.com
FRONTEND_URL=https://app.example.com
```

### Email Templates

**1. Registration Confirmation**
```
Purpose: Email verification during signup
Variables: firstName, email, confirmLink
Status: Confirms user ownership of email address
Expiry: 24 hours
```

**2. Password Reset**
```
Purpose: Account recovery
Variables: email, resetLink
Status: Time-limited reset link
Expiry: 1 hour
```

**3. Suspicious Login Alert**
```
Purpose: Security notification
Variables: firstName, email, ipAddress, location, timestamp
Status: Informs user of unusual access
Action: User can revoke session if unauthorized
```

**4. Client Registration**
```
Purpose: OAuth client creation confirmation
Variables: firstName, clientName, credentials
Status: Notifies of new OAuth client
```

**5. Secret Rotation**
```
Purpose: OAuth secret change notification
Variables: firstName, clientName, timestamp
Status: Confirms credential rotation
```

**6. 2FA Enabled**
```
Purpose: Two-factor authentication setup confirmation
Variables: firstName, timestamp
Status: Confirms 2FA is now active
```

**7. Security Alert**
```
Purpose: Generic security events
Variables: firstName, eventType, timestamp, details
Status: Notifies of security-related changes
```

### Usage

**Send Email Immediately** (blocking):
```typescript
import { emailService } from './services/EmailService';

await emailService.sendEmail('user@example.com', {
  subject: 'Welcome',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!'
});
```

**Queue Email for Async Delivery** (recommended):
```typescript
await emailService.queueEmail({
  to: 'user@example.com',
  templateName: 'registration',
  variables: {
    firstName: 'John',
    email: 'john@example.com',
    confirmLink: 'https://app.example.com/verify?token=abc123'
  },
  priority: 'high' // high, normal, low
});
```

**Process Email Queue** (background job):
```typescript
// Run periodically (every 5 minutes)
setInterval(async () => {
  await emailService.processEmailQueue();
}, 5 * 60 * 1000);
```

### API Endpoints

**Resend Confirmation Email**
```
POST /api/v1/auth/email/resend-confirmation
Authorization: Bearer {token}

Response:
{
  "message": "Confirmation email sent successfully"
}
```

**Request Password Reset**
```
POST /api/v1/auth/email/request-password-reset
Content-Type: application/json

{
  "email": "user@example.com"
}

Response:
{
  "message": "If an account exists with this email, a password reset link will be sent"
}
```

**Get Email Preferences**
```
GET /api/v1/auth/email/preferences
Authorization: Bearer {token}

Response:
{
  "marketing": true,
  "security": true,
  "productUpdates": true,
  "weeklyDigest": false,
  "loginAlerts": true,
  "newDeviceAlerts": true,
  "passwordChangeAlerts": true
}
```

**Update Email Preferences**
```
POST /api/v1/auth/email/preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "marketing": false,
  "security": true,
  "productUpdates": false
}

Response:
{
  "message": "Email preferences updated successfully",
  "preferences": { ... }
}
```

**Verify Email**
```
POST /api/v1/auth/email/verify
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

Response:
{
  "message": "Email verified successfully"
}
```

---

## 2. Two-Factor Authentication (2FA)

### Overview
Enterprise-grade 2FA using TOTP (Time-based One-Time Password) with QR code generation, backup codes, and trusted device management.

### File: `src/services/TwoFactorService.ts`

**Dependencies**:
```bash
npm install speakeasy qrcode
```

### 2FA Setup Flow

**1. Initiate Setup** (GET):
```
GET /api/v1/auth/2fa/setup
Authorization: Bearer {token}

Response:
{
  "secret": "JBSWY3DPEBLW64TMMQXGOI3NNRXGOI3PPFXWS43BOMNXGOIDLOM====",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQA...",
  "message": "Scan the QR code with your authenticator app"
}
```

**2. Verify & Enable 2FA** (POST):
```
POST /api/v1/auth/2fa/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "secret": "JBSWY3DPEBLW64TMMQXGOI3NNRXGOI3PPFXWS43BOMNXGOIDLOM====",
  "token": "123456"
}

Response:
{
  "message": "2FA enabled successfully",
  "backupCodes": [
    "9J8K3L2M",
    "4X5C6V7B",
    "2Q3W4E5R",
    ...
  ],
  "warning": "Save these backup codes in a safe place..."
}
```

### 2FA Login Flow

**1. Create Challenge** (POST):
```
POST /api/v1/auth/2fa/challenge
Content-Type: application/json

{
  "userId": "user_123"
}

Response:
{
  "challengeId": "chal_xyz789",
  "expiresIn": 300,
  "message": "Enter the verification code..."
}
```

**2. Verify Challenge with OTP** (POST):
```
POST /api/v1/auth/2fa/verify-challenge
Content-Type: application/json

{
  "userId": "user_123",
  "challengeId": "chal_xyz789",
  "token": "123456",
  "trustDevice": true,
  "deviceId": "device_abc",
  "deviceName": "Chrome on MacBook"
}

Response:
{
  "verified": true,
  "message": "2FA verification successful",
  "shouldIssueToken": true
}
```

### Backup Codes

**Get Backup Code Count**:
```
GET /api/v1/auth/2fa/backup-codes
Authorization: Bearer {token}

Response:
{
  "backupCodesRemaining": 3,
  "message": "You have 3 backup codes remaining"
}
```

**Regenerate Backup Codes**:
```
POST /api/v1/auth/2fa/backup-codes/regenerate
Authorization: Bearer {token}

Response:
{
  "message": "New backup codes generated successfully",
  "backupCodes": [...],
  "warning": "Your previous backup codes are no longer valid..."
}
```

### Trusted Devices

**List Trusted Devices**:
```
GET /api/v1/auth/2fa/trusted-devices
Authorization: Bearer {token}

Response:
{
  "devices": [
    {
      "id": "device_abc",
      "name": "Chrome on MacBook",
      "trustedAt": "2025-11-17T10:30:00Z",
      "expiresAt": "2025-12-17T10:30:00Z"
    },
    ...
  ]
}
```

**Remove Trusted Device**:
```
DELETE /api/v1/auth/2fa/trusted-devices/{deviceId}
Authorization: Bearer {token}

Response:
{
  "message": "Device trust removed"
}
```

**Revoke All Device Trusts** (logout all devices):
```
POST /api/v1/auth/2fa/trusted-devices/revoke-all
Authorization: Bearer {token}

Response:
{
  "message": "All device trusts revoked"
}
```

### Configuration

**In `config/env.ts`**:
```typescript
// 2FA Configuration
TWO_FACTOR_TOTP_WINDOW=2 // Number of time windows to allow
TWO_FACTOR_CHALLENGE_EXPIRY_SECONDS=300 // 5 minutes
TWO_FACTOR_DEVICE_TRUST_DAYS=30
TWO_FACTOR_BACKUP_CODES_COUNT=10
```

### Using Authenticator Apps

**Supported Apps**:
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass Authenticator

**Setup Instructions**:
1. User receives QR code from `/api/v1/auth/2fa/setup`
2. Opens authenticator app and selects "Add Account" or scans QR code
3. Authenticator generates 6-digit codes every 30 seconds
4. User enters one code to verify setup

### Implementation in AuthService

**Enable 2FA During Registration** (optional):
```typescript
// After user verifies email
const setupEndpoint = `/api/v1/auth/2fa/setup`;
// User scans QR code and verifies
// On verification, 2FA becomes active
```

**Require 2FA at Login**:
```typescript
// After password verification
if (await twoFactorService.isTwoFactorEnabled(userId)) {
  const challenge = await TwoFactorChallenge.createChallenge(userId);
  return { needsTwoFactor: true, challengeId: challenge };
}
```

---

## 3. Webhook Support

### Overview
Event-driven webhook system with automatic retry, signature verification, and delivery tracking.

### File: `src/services/WebhookService.ts`

**Dependencies**:
```bash
npm install axios
```

### Webhook Setup

**Register Webhook Endpoint** (POST):
```
POST /api/v1/webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://example.com/webhooks",
  "events": ["user.created", "token.generated", "login.failed"],
  "secret": "optional_custom_secret"
}

Response:
{
  "id": "webhook_1731853200000_abc123",
  "url": "https://example.com/webhooks",
  "events": ["user.created", "token.generated", "login.failed"],
  "secret": "generated_secret_if_not_provided",
  "message": "Webhook registered successfully"
}
```

### Supported Events

**User Events**:
- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User account deleted

**Client Events**:
- `client.created` - OAuth client created
- `client.updated` - Client configuration changed
- `client.deleted` - Client deleted
- `client.secret_rotated` - Client secret rotated

**Token Events**:
- `token.generated` - New token issued
- `token.revoked` - Token revoked

**Scope Events**:
- `scope.created` - New scope created
- `scope.updated` - Scope modified
- `scope.deleted` - Scope removed

**Login & Security Events**:
- `login.successful` - Successful user login
- `login.failed` - Failed login attempt
- `password.changed` - User password changed
- `mfa.enabled` - 2FA activated
- `mfa.disabled` - 2FA deactivated

### Webhook Payload Format

All webhook payloads follow this structure:

```json
{
  "eventId": "event_1731853200000_xyz789",
  "eventType": "user.created",
  "timestamp": "2025-11-17T10:30:00Z",
  "data": {
    "userId": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2025-11-17T10:30:00Z"
  }
}
```

### Signature Verification

Webhooks are signed using HMAC-SHA256. Verify using the webhook secret:

**NodeJS Example**:
```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In your webhook handler
const signature = req.headers['x-webhook-signature'];
const payload = req.rawBody; // Must be raw string, not parsed JSON

if (!verifySignature(payload, signature, YOUR_WEBHOOK_SECRET)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Webhook Headers

Each webhook delivery includes these headers:

```
Content-Type: application/json
X-Webhook-Signature: hmac_sha256_signature
X-Webhook-ID: webhook_endpoint_id
X-Event-Type: user.created
X-Event-ID: unique_event_id
```

### Retry Logic

Webhooks use exponential backoff on failure:

```
Attempt 1: Immediate
Attempt 2: 1 minute delay
Attempt 3: 2 minutes delay
Attempt 4: 4 minutes delay
Attempt 5: 8 minutes delay
Max: 24 hours
```

Configuration:
```
MAX_RETRIES=5
INITIAL_RETRY_DELAY_SECONDS=60
MAX_RETRY_DELAY_SECONDS=86400
REQUEST_TIMEOUT_SECONDS=30
```

### API Endpoints

**List Webhooks**:
```
GET /api/v1/webhooks
Authorization: Bearer {token}

Response:
{
  "count": 2,
  "webhooks": [
    {
      "id": "webhook_...",
      "url": "https://example.com/webhooks",
      "events": ["user.created"],
      "isActive": true,
      "createdAt": "2025-11-17T10:00:00Z"
    }
  ]
}
```

**Get Webhook Details**:
```
GET /api/v1/webhooks/{webhookId}
Authorization: Bearer {token}
```

**Update Webhook**:
```
PATCH /api/v1/webhooks/{webhookId}
Authorization: Bearer {token}

{
  "url": "https://new-url.com/webhooks",
  "events": ["user.created", "token.generated"],
  "isActive": false
}
```

**Delete Webhook**:
```
DELETE /api/v1/webhooks/{webhookId}
Authorization: Bearer {token}
```

**Get Event History**:
```
GET /api/v1/webhooks/{webhookId}/events?limit=100
Authorization: Bearer {token}

Response:
{
  "count": 50,
  "events": [
    {
      "id": "event_...",
      "eventType": "user.created",
      "status": "delivered",
      "retries": 0,
      "deliveredAt": "2025-11-17T10:31:00Z",
      "createdAt": "2025-11-17T10:30:00Z"
    }
  ]
}
```

**Resend Failed Event**:
```
POST /api/v1/webhooks/{webhookId}/events/{eventId}/resend
Authorization: Bearer {token}

Response:
{
  "message": "Event requeued for delivery"
}
```

**Test Webhook**:
```
POST /api/v1/webhooks/test
Authorization: Bearer {token}

{
  "webhookId": "webhook_..."
}

Response:
{
  "message": "Test webhook delivered",
  "note": "Check your webhook endpoint logs for delivery confirmation"
}
```

### Webhook Processing

**Background Job Setup**:
```typescript
// Run every 30 seconds
setInterval(async () => {
  await webhookService.processDeliveryQueue();
}, 30 * 1000);
```

### Triggering Webhooks

**In Services** (e.g., AuthService, UserService):
```typescript
import { webhookService } from './services/WebhookService';

// After user creation
await webhookService.triggerEvent('user.created', {
  userId: newUser.id,
  email: newUser.email,
  name: newUser.name,
  createdAt: new Date().toISOString()
});

// After login
await webhookService.triggerEvent('login.successful', {
  userId: user.id,
  email: user.email,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  timestamp: new Date().toISOString()
});
```

---

## Integration Checklist

### Phase 3b Integration Steps

- [ ] **Install Dependencies**
  ```bash
  npm install nodemailer speakeasy qrcode axios
  npm install --save-dev @types/nodemailer @types/speakeasy
  ```

- [ ] **Update Environment Variables**
  - Add email provider config (SMTP or SendGrid)
  - Add 2FA configuration
  - Add webhook retry settings
  - Set FRONTEND_URL for email links

- [ ] **Database Migrations** (if using database for preferences)
  - Add `emailPreferences` table to users
  - Add `twoFactorSecret` storage
  - Add `webhooks` and `webhookEvents` tables

- [ ] **Integrate with AuthService**
  - Call `emailService.sendEmail()` on registration
  - Call `twoFactorService` in login flow if 2FA enabled
  - Create email verification flow

- [ ] **Integrate with UserService**
  - Trigger webhook on user creation/update/delete
  - Send email on profile changes

- [ ] **Background Jobs**
  - Email queue processor (every 5 minutes)
  - Webhook delivery processor (every 30 seconds)

- [ ] **Testing**
  - Test email sending with real SMTP
  - Test 2FA QR code generation and OTP verification
  - Test webhook delivery and retry logic
  - Test signature verification

- [ ] **Documentation**
  - Client integration guide for webhooks
  - Email template customization
  - 2FA setup guide for end users

---

## Security Considerations

### Email Security
- ✅ SMTP/SendGrid support for secure delivery
- ✅ Tokens expire (24 hours for email verification)
- ✅ Rate limiting on email endpoints
- ✅ Password never sent via email

### 2FA Security
- ✅ TOTP with 32-byte secrets (RFC 6238 compliant)
- ✅ ±2 time window for clock skew tolerance
- ✅ Backup codes for account recovery
- ✅ Device trust with expiry
- ✅ Challenge expiry (5 minutes default)

### Webhook Security
- ✅ HMAC-SHA256 signature verification
- ✅ Exponential backoff prevents hammering
- ✅ 30-second request timeout
- ✅ Webhook secret rotation capability
- ✅ Event audit trail in Redis

---

## Performance Optimization

### Email
- Queued delivery prevents blocking
- Redis-backed queue for persistence
- Max 3 retries prevents infinite loops
- Priority levels (high/normal/low)

### 2FA
- In-memory TOTP verification
- Redis caching for frequently accessed secrets
- Efficient QR code generation (base64 PNG)

### Webhooks
- Asynchronous delivery via background queue
- Exponential backoff prevents overwhelming endpoints
- Event history retention for debugging
- Signature verification at receiver

---

## Troubleshooting

### Email Not Sending
1. Check EMAIL_PROVIDER configuration
2. Verify SMTP credentials or SendGrid API key
3. Check email queue processor is running
4. Review logs in `processEmailQueue()`

### 2FA Not Working
1. Verify system clock is synchronized (TOTP is time-based)
2. Check speakeasy configuration
3. Test with Google Authenticator app
4. Verify 32-byte secret generation

### Webhook Delivery Failing
1. Check webhook endpoint is accessible
2. Verify signature verification logic
3. Check request timeout setting (30 seconds default)
4. Review retry logic and event history

---

## Next Steps

- Implement email template customization
- Add webhook payload transformation
- Implement 2FA enforcement policies
- Create 2FA recovery flows
- Add email bounce handling
- Implement webhook rate limits per endpoint

