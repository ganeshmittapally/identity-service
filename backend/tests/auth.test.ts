import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/utils/database';

describe('Authentication Endpoints', () => {
  beforeAll(async () => {
    // Setup test database
    // Clear test data before each test suite
  });

  afterAll(async () => {
    // Cleanup test database
    await db.end();
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app).post('/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toMatchObject({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app).post('/v1/auth/register').send({
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid email');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app).post('/v1/auth/register').send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await request(app).post('/v1/auth/register').send({
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      // Duplicate registration
      const res = await request(app).post('/v1/auth/register').send({
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        firstName: 'Test2',
        lastName: 'User2',
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/v1/auth/register').send({
        email: 'login@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });
    });

    it('should login user with correct credentials', async () => {
      const res = await request(app).post('/v1/auth/login').send({
        email: 'login@example.com',
        password: 'TestPassword123!',
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('login@example.com');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app).post('/v1/auth/login').send({
        email: 'login@example.com',
        password: 'WrongPassword123!',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app).post('/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid credentials');
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('should issue new access token with valid refresh token', async () => {
      // Register and get tokens
      const registerRes = await request(app).post('/v1/auth/register').send({
        email: 'refresh@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const refreshToken = registerRes.body.refreshToken;

      // Refresh token
      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: 'invalid_token' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Invalid refresh token');
    });

    it('should reject expired refresh token', async () => {
      // This would need a token that's actually expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';

      const res = await request(app)
        .post('/v1/auth/refresh')
        .send({ refreshToken: expiredToken });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('should logout user with valid token', async () => {
      const registerRes = await request(app).post('/v1/auth/register').send({
        email: 'logout@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      });

      const accessToken = registerRes.body.accessToken;

      const res = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Logged out');
    });

    it('should reject logout without token', async () => {
      const res = await request(app).post('/v1/auth/logout');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Authorization required');
    });
  });
});
