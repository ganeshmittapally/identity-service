import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { Express } from 'express';

/**
 * Admin Panel Integration Tests
 * Tests admin dashboard functionality and user management
 */

let app: Express;
let adminToken: string;
let userId: string;

describe('Admin Dashboard Integration Tests', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Admin User Management', () => {
    test('should list all users with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?limit=20&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    test('should filter users by status', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?filter[status]=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.data.users.forEach((user: any) => {
        expect(user.status).toBe('active');
      });
    });

    test('should suspend a user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          durationMinutes: 1440,
          reason: 'Suspicious activity',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'suspended');
      expect(response.body.data).toHaveProperty('suspendedUntil');
    });

    test('should unsuspend a user', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${userId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'active');
    });

    test('should reset user login attempts', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/users/${userId}/reset-login-attempts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('loginAttempts', 0);
    });
  });

  describe('Admin Client Management', () => {
    let clientId: string;

    test('should list all OAuth clients', async () => {
      const response = await request(app)
        .get('/api/v1/admin/clients?limit=20&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.clients)).toBe(true);
      if (response.body.data.clients.length > 0) {
        clientId = response.body.data.clients[0].clientId;
      }
    });

    test('should revoke an OAuth client', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/clients/${clientId}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Compromised credentials' })
        .expect(200);

      expect(response.body.data).toHaveProperty('status', 'revoked');
    });

    test('should reset client secret', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/clients/${clientId}/reset-secret`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('newSecret');
      expect(response.body.data).toHaveProperty('secretResetAt');
    });
  });

  describe('System Configuration', () => {
    test('should get system configuration', async () => {
      const response = await request(app)
        .get('/api/v1/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('tokenExpiration');
      expect(response.body.data).toHaveProperty('refreshTokenExpiration');
      expect(response.body.data).toHaveProperty('maxLoginAttempts');
      expect(response.body.data).toHaveProperty('requireMFA');
    });

    test('should update system configuration', async () => {
      const response = await request(app)
        .patch('/api/v1/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tokenExpiration: 7200,
          maxLoginAttempts: 10,
        })
        .expect(200);

      expect(response.body.data.tokenExpiration).toBe(7200);
      expect(response.body.data.maxLoginAttempts).toBe(10);
    });

    test('should enforce configuration changes', async () => {
      // Update config
      await request(app)
        .patch('/api/v1/admin/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ maxLoginAttempts: 3 })
        .expect(200);

      // Verify new config is used (by checking failed login behavior)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong',
          });
      }

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'correct',
        });

      expect(response.status).toBe(429); // Rate limited
    });
  });

  describe('Dashboard Statistics', () => {
    test('should get dashboard statistics', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.stats).toHaveProperty('totalUsers');
      expect(response.body.data.stats).toHaveProperty('activeUsers');
      expect(response.body.data.stats).toHaveProperty('suspendedUsers');
      expect(response.body.data.stats).toHaveProperty('totalClients');
      expect(response.body.data.stats).toHaveProperty('activeClients');
      expect(response.body.data.stats).toHaveProperty('systemHealth');
    });

    test('should return accurate user counts', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const stats = response.body.data.stats;
      expect(stats.activeUsers).toBeLessThanOrEqual(stats.totalUsers);
      expect(stats.suspendedUsers).toBeLessThanOrEqual(stats.totalUsers);
    });
  });

  describe('Audit Logging', () => {
    test('should retrieve audit logs', async () => {
      const response = await request(app)
        .get('/api/v1/admin/audit-logs?limit=50&offset=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data.logs)).toBe(true);
      expect(response.body.data).toHaveProperty('pagination');
    });

    test('should log admin actions', async () => {
      // Perform admin action
      await request(app)
        .post(`/api/v1/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ durationMinutes: 60 })
        .expect(200);

      // Check audit log
      const response = await request(app)
        .get('/api/v1/admin/audit-logs?filter[action]=user:suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.logs[0].action).toBe('user:suspend');
    });

    test('should include admin identity in audit logs', async () => {
      const response = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      if (response.body.data.logs.length > 0) {
        expect(response.body.data.logs[0]).toHaveProperty('admin');
        expect(response.body.data.logs[0]).toHaveProperty('timestamp');
      }
    });
  });
});

export default {};
