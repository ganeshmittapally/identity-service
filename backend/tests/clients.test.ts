import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/utils/database';

describe('OAuth Client Endpoints', () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register and login test user
    const registerRes = await request(app).post('/v1/auth/register').send({
      email: 'client-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'Client',
    });

    accessToken = registerRes.body.accessToken;
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /v1/clients', () => {
    it('should create OAuth client with valid data', async () => {
      const res = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'My App',
          clientType: 'web',
          redirectUris: ['http://localhost:3000/callback'],
          allowedScopes: ['openid', 'profile', 'email'],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('clientId');
      expect(res.body).toHaveProperty('clientSecret');
      expect(res.body.clientName).toBe('My App');
      expect(res.body.clientType).toBe('web');
    });

    it('should reject client creation without auth', async () => {
      const res = await request(app).post('/v1/clients').send({
        clientName: 'My App',
        clientType: 'web',
        redirectUris: ['http://localhost:3000/callback'],
      });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Authorization required');
    });

    it('should reject invalid redirect URI', async () => {
      const res = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'My App',
          clientType: 'web',
          redirectUris: ['invalid-url'],
          allowedScopes: ['openid', 'profile'],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid redirect URI');
    });

    it('should reject invalid scopes', async () => {
      const res = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'My App',
          clientType: 'web',
          redirectUris: ['http://localhost:3000/callback'],
          allowedScopes: ['invalid_scope'],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Invalid scope');
    });
  });

  describe('GET /v1/clients', () => {
    it('should list all user clients', async () => {
      const res = await request(app)
        .get('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should reject without auth', async () => {
      const res = await request(app).get('/v1/clients');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /v1/clients/:clientId', () => {
    let clientId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'Update Test',
          clientType: 'web',
          redirectUris: ['http://localhost:3000/callback'],
          allowedScopes: ['openid'],
        });

      clientId = createRes.body.clientId;
    });

    it('should update client with valid data', async () => {
      const res = await request(app)
        .patch(`/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'Updated Name',
          allowedScopes: ['openid', 'profile'],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.clientName).toBe('Updated Name');
    });

    it('should reject update for non-existent client', async () => {
      const res = await request(app)
        .patch('/v1/clients/invalid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ clientName: 'Updated' });

      expect(res.statusCode).toBe(404);
    });

    it('should reject unauthorized update', async () => {
      const otherRes = await request(app).post('/v1/auth/register').send({
        email: 'other-user@example.com',
        password: 'TestPassword123!',
        firstName: 'Other',
        lastName: 'User',
      });

      const otherToken = otherRes.body.accessToken;

      const res = await request(app)
        .patch(`/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ clientName: 'Hacked' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Unauthorized');
    });
  });

  describe('DELETE /v1/clients/:clientId', () => {
    let clientId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'Delete Test',
          clientType: 'web',
          redirectUris: ['http://localhost:3000/callback'],
        });

      clientId = createRes.body.clientId;
    });

    it('should delete client successfully', async () => {
      const res = await request(app)
        .delete(`/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);

      // Verify deletion
      const getRes = await request(app)
        .get(`/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getRes.statusCode).toBe(404);
    });

    it('should reject deletion without auth', async () => {
      const res = await request(app).delete(`/v1/clients/${clientId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /v1/clients/:clientId/revoke-secret', () => {
    let clientId: string;
    let oldSecret: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/v1/clients')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          clientName: 'Secret Test',
          clientType: 'web',
          redirectUris: ['http://localhost:3000/callback'],
        });

      clientId = createRes.body.clientId;
      oldSecret = createRes.body.clientSecret;
    });

    it('should revoke and rotate client secret', async () => {
      const res = await request(app)
        .post(`/v1/clients/${clientId}/revoke-secret`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('clientSecret');
      expect(res.body.clientSecret).not.toBe(oldSecret);
    });

    it('should reject revoke without auth', async () => {
      const res = await request(app).post(`/v1/clients/${clientId}/revoke-secret`);

      expect(res.statusCode).toBe(401);
    });
  });
});
