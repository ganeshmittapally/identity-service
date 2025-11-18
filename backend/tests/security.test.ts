import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/utils/database';
import * as speakeasy from 'speakeasy';

describe('Two-Factor Authentication', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const registerRes = await request(app).post('/v1/auth/register').send({
      email: '2fa-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
    });

    accessToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /v1/auth/2fa/setup', () => {
    it('should generate 2FA setup with QR code', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('qrCode');
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('backupCodes');
      expect(res.body.backupCodes).toHaveLength(8);
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/v1/auth/2fa/setup');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/enable', () => {
    let secret: string;

    beforeEach(async () => {
      const setupRes = await request(app)
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      secret = setupRes.body.secret;
    });

    it('should enable 2FA with valid verification code', async () => {
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32',
      });

      const res = await request(app)
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ verificationCode: token });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('2FA enabled');
    });

    it('should reject invalid verification code', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ verificationCode: '000000' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid verification code');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/enable')
        .send({ verificationCode: '123456' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/disable', () => {
    it('should disable 2FA with valid password', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'TestPassword123!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('2FA disabled');
    });

    it('should reject with incorrect password', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/disable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'WrongPassword123!' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid password');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/disable')
        .send({ password: 'TestPassword123!' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/verify', () => {
    it('should verify 2FA code at login', async () => {
      // Setup and enable 2FA first
      const setupRes = await request(app)
        .post('/v1/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`);

      const secret = setupRes.body.secret;

      const enableRes = await request(app)
        .post('/v1/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ verificationCode: speakeasy.totp({ secret, encoding: 'base32' }) });

      expect(enableRes.statusCode).toBe(200);

      // Login and get 2FA challenge
      const loginRes = await request(app).post('/v1/auth/login').send({
        email: '2fa-test@example.com',
        password: 'TestPassword123!',
      });

      expect(loginRes.statusCode).toBe(202); // 2FA Required
      const tempToken = loginRes.body.tempToken;

      // Verify 2FA code
      const verifyRes = await request(app)
        .post('/v1/auth/2fa/verify')
        .send({
          tempToken,
          verificationCode: speakeasy.totp({ secret, encoding: 'base32' }),
        });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body).toHaveProperty('accessToken');
    });

    it('should reject invalid 2FA code', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/verify')
        .send({
          tempToken: 'invalid-temp-token',
          verificationCode: '000000',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/2fa/backup-codes/regenerate', () => {
    it('should regenerate backup codes', async () => {
      const res = await request(app)
        .post('/v1/auth/2fa/backup-codes/regenerate')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('backupCodes');
      expect(res.body.backupCodes).toHaveLength(8);
    });

    it('should reject without auth', async () => {
      const res = await request(app).post('/v1/auth/2fa/backup-codes/regenerate');

      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Password Management', () => {
  let accessToken: string;
  let email: string;

  beforeAll(async () => {
    email = `pwd-test-${Date.now()}@example.com`;
    const registerRes = await request(app).post('/v1/auth/register').send({
      email,
      password: 'OldPassword123!',
      firstName: 'Test',
      lastName: 'User',
    });

    accessToken = registerRes.body.accessToken;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /v1/auth/password/change', () => {
    it('should change password with valid old password', async () => {
      const res = await request(app)
        .post('/v1/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'OldPassword123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('changed');
    });

    it('should reject with incorrect old password', async () => {
      const res = await request(app)
        .post('/v1/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'WrongPassword123!',
          newPassword: 'NewPassword456!',
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject weak new password', async () => {
      const res = await request(app)
        .post('/v1/auth/password/change')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          oldPassword: 'OldPassword123!',
          newPassword: 'weak',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('password');
    });
  });

  describe('POST /v1/auth/password/reset-request', () => {
    it('should send password reset email', async () => {
      const res = await request(app).post('/v1/auth/password/reset-request').send({
        email,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Check your email');
    });

    it('should handle non-existent email gracefully', async () => {
      const res = await request(app).post('/v1/auth/password/reset-request').send({
        email: 'nonexistent@example.com',
      });

      // Should return 200 for security (not leaking if email exists)
      expect(res.statusCode).toBe(200);
    });
  });
});
