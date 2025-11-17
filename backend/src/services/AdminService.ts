import { redis } from '../config/redis';
import { database } from '../config/database';
import { logger } from '../config/logger';

/**
 * Admin Service
 * Provides admin functionality for user management, client management, system config, and analytics
 */

export interface AdminUser {
  userId: string;
  email: string;
  username: string;
  role: string;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  lastLogin?: string;
  loginAttempts: number;
  suspendedUntil?: string;
}

export interface AdminClient {
  clientId: string;
  clientName: string;
  clientType: 'public' | 'confidential';
  status: 'active' | 'inactive' | 'revoked';
  owner: string;
  createdAt: string;
  redirectUris: string[];
  allowedScopes: string[];
  tokenCount: number;
  lastUsed?: string;
}

export interface AdminSystemConfig {
  tokenExpiration: number;
  refreshTokenExpiration: number;
  codeTTL: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordMinLength: number;
  requireMFA: boolean;
  maintenanceMode: boolean;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  admin: string;
  targetUser?: string;
  targetClient?: string;
  changes: Record<string, unknown>;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalClients: number;
  activeClients: number;
  totalTokens: number;
  activeTokens: number;
  failedLogins: number;
  successfulLogins: number;
  apiErrorRate: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  uptime: number;
}

/**
 * Admin Service
 */
export class AdminService {
  private readonly ADMIN_CACHE_PREFIX = 'admin:';
  private readonly AUDIT_LOG_PREFIX = 'audit:';
  private readonly CONFIG_CACHE_KEY = 'admin:config';

  /**
   * Get all users with pagination and filtering
   */
  async getAllUsers(offset: number = 0, limit: number = 20, filters?: Record<string, unknown>): Promise<{
    users: AdminUser[];
    total: number;
  }> {
    try {
      let query = 'SELECT id, email, username, role, status, created_at, last_login, login_attempts, suspended_until FROM users';
      const params: unknown[] = [];

      if (filters?.status) {
        query += ' WHERE status = $' + (params.length + 1);
        params.push(filters.status);
      }

      if (filters?.role) {
        const condition = ` AND role = $${params.length + 1}`;
        query += params.length === 0 ? query.includes('WHERE') ? condition : ' WHERE role = $1' : condition;
        params.push(filters.role);
      }

      // Get total count
      const countQuery = query.split('SELECT')[0] + 'SELECT COUNT(*) as count FROM users' + query.substring(query.indexOf('FROM users') + 10);
      const countResult = await database.query(countQuery, params);
      const total = countResult.rows[0].count;

      // Get paginated results
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      const users: AdminUser[] = result.rows.map((row: any) => ({
        userId: row.id,
        email: row.email,
        username: row.username,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        lastLogin: row.last_login,
        loginAttempts: row.login_attempts,
        suspendedUntil: row.suspended_until,
      }));

      return { users, total };
    } catch (error) {
      logger.error('Error fetching users', { error });
      throw error;
    }
  }

  /**
   * Get all clients with pagination and filtering
   */
  async getAllClients(offset: number = 0, limit: number = 20, filters?: Record<string, unknown>): Promise<{
    clients: AdminClient[];
    total: number;
  }> {
    try {
      let query = 'SELECT id, name, type, status, owner, created_at, redirect_uris, scopes, last_used FROM clients';
      const params: unknown[] = [];

      if (filters?.status) {
        query += ' WHERE status = $' + (params.length + 1);
        params.push(filters.status);
      }

      if (filters?.owner) {
        const condition = ` AND owner = $${params.length + 1}`;
        query += params.length === 0 ? ' WHERE owner = $1' : condition;
        params.push(filters.owner);
      }

      // Get total count
      const countResult = await database.query('SELECT COUNT(*) as count FROM clients', []);
      const total = countResult.rows[0].count;

      // Get paginated results
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      const clients: AdminClient[] = result.rows.map((row: any) => ({
        clientId: row.id,
        clientName: row.name,
        clientType: row.type,
        status: row.status,
        owner: row.owner,
        createdAt: row.created_at,
        redirectUris: row.redirect_uris || [],
        allowedScopes: row.scopes || [],
        tokenCount: 0,
        lastUsed: row.last_used,
      }));

      return { clients, total };
    } catch (error) {
      logger.error('Error fetching clients', { error });
      throw error;
    }
  }

  /**
   * Suspend a user account
   */
  async suspendUser(userId: string, durationMinutes: number, reason: string, adminId: string): Promise<boolean> {
    try {
      const suspendUntil = new Date(Date.now() + durationMinutes * 60000);
      await database.query(
        'UPDATE users SET status = $1, suspended_until = $2 WHERE id = $3',
        ['suspended', suspendUntil, userId]
      );

      await this.logAuditEvent({
        action: 'user:suspend',
        admin: adminId,
        targetUser: userId,
        changes: { durationMinutes, reason, suspendedUntil: suspendUntil.toISOString() },
      });

      // Invalidate user cache
      await redis.del(`${this.ADMIN_CACHE_PREFIX}user:${userId}`);

      logger.info('User suspended', { userId, adminId, durationMinutes });
      return true;
    } catch (error) {
      logger.error('Error suspending user', { error, userId });
      throw error;
    }
  }

  /**
   * Unsuspend a user account
   */
  async unsuspendUser(userId: string, adminId: string): Promise<boolean> {
    try {
      await database.query(
        'UPDATE users SET status = $1, suspended_until = NULL WHERE id = $2',
        ['active', userId]
      );

      await this.logAuditEvent({
        action: 'user:unsuspend',
        admin: adminId,
        targetUser: userId,
        changes: {},
      });

      await redis.del(`${this.ADMIN_CACHE_PREFIX}user:${userId}`);
      logger.info('User unsuspended', { userId, adminId });
      return true;
    } catch (error) {
      logger.error('Error unsuspending user', { error, userId });
      throw error;
    }
  }

  /**
   * Reset user login attempts
   */
  async resetLoginAttempts(userId: string, adminId: string): Promise<boolean> {
    try {
      await database.query(
        'UPDATE users SET login_attempts = 0 WHERE id = $1',
        [userId]
      );

      await this.logAuditEvent({
        action: 'user:reset_login_attempts',
        admin: adminId,
        targetUser: userId,
        changes: { loginAttempts: 0 },
      });

      await redis.del(`${this.ADMIN_CACHE_PREFIX}user:${userId}`);
      return true;
    } catch (error) {
      logger.error('Error resetting login attempts', { error, userId });
      throw error;
    }
  }

  /**
   * Revoke a client
   */
  async revokeClient(clientId: string, reason: string, adminId: string): Promise<boolean> {
    try {
      await database.query(
        'UPDATE clients SET status = $1 WHERE id = $2',
        ['revoked', clientId]
      );

      await this.logAuditEvent({
        action: 'client:revoke',
        admin: adminId,
        targetClient: clientId,
        changes: { reason, status: 'revoked' },
      });

      await redis.del(`${this.ADMIN_CACHE_PREFIX}client:${clientId}`);
      logger.info('Client revoked', { clientId, adminId, reason });
      return true;
    } catch (error) {
      logger.error('Error revoking client', { error, clientId });
      throw error;
    }
  }

  /**
   * Reset client secret
   */
  async resetClientSecret(clientId: string, adminId: string): Promise<string> {
    try {
      const newSecret = this.generateSecret();
      await database.query(
        'UPDATE clients SET client_secret = $1 WHERE id = $2',
        [newSecret, clientId]
      );

      await this.logAuditEvent({
        action: 'client:reset_secret',
        admin: adminId,
        targetClient: clientId,
        changes: { secretResetAt: new Date().toISOString() },
      });

      await redis.del(`${this.ADMIN_CACHE_PREFIX}client:${clientId}`);
      logger.info('Client secret reset', { clientId, adminId });
      return newSecret;
    } catch (error) {
      logger.error('Error resetting client secret', { error, clientId });
      throw error;
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<AdminSystemConfig> {
    try {
      const cached = await redis.get(this.CONFIG_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      const result = await database.query('SELECT config_data FROM system_config LIMIT 1', []);
      const config: AdminSystemConfig = result.rows[0]?.config_data || {
        tokenExpiration: 3600,
        refreshTokenExpiration: 604800,
        codeTTL: 600,
        maxLoginAttempts: 5,
        lockoutDuration: 1800,
        passwordMinLength: 12,
        requireMFA: false,
        maintenanceMode: false,
      };

      await redis.setex(this.CONFIG_CACHE_KEY, 300, JSON.stringify(config));
      return config;
    } catch (error) {
      logger.error('Error fetching system config', { error });
      throw error;
    }
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(updates: Partial<AdminSystemConfig>, adminId: string): Promise<AdminSystemConfig> {
    try {
      const current = await this.getSystemConfig();
      const updated = { ...current, ...updates };

      await database.query(
        'INSERT INTO system_config (config_data) VALUES ($1) ON CONFLICT DO UPDATE SET config_data = $1',
        [JSON.stringify(updated)]
      );

      await this.logAuditEvent({
        action: 'system:config_update',
        admin: adminId,
        changes: updates,
      });

      await redis.del(this.CONFIG_CACHE_KEY);
      logger.info('System config updated', { adminId, changes: updates });
      return updated;
    } catch (error) {
      logger.error('Error updating system config', { error });
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      const usersResult = await database.query(
        'SELECT COUNT(*) as total, ' +
        'SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as active, ' +
        'SUM(CASE WHEN status = $2 THEN 1 ELSE 0 END) as suspended ' +
        'FROM users',
        ['active', 'suspended']
      );

      const clientsResult = await database.query(
        'SELECT COUNT(*) as total, ' +
        'SUM(CASE WHEN status = $1 THEN 1 ELSE 0 END) as active ' +
        'FROM clients',
        ['active']
      );

      const tokensResult = await database.query(
        'SELECT COUNT(*) as total, ' +
        'SUM(CASE WHEN revoked_at IS NULL THEN 1 ELSE 0 END) as active ' +
        'FROM tokens',
        []
      );

      const stats: AdminDashboardStats = {
        totalUsers: usersResult.rows[0]?.total || 0,
        activeUsers: usersResult.rows[0]?.active || 0,
        suspendedUsers: usersResult.rows[0]?.suspended || 0,
        totalClients: clientsResult.rows[0]?.total || 0,
        activeClients: clientsResult.rows[0]?.active || 0,
        totalTokens: tokensResult.rows[0]?.total || 0,
        activeTokens: tokensResult.rows[0]?.active || 0,
        failedLogins: 0,
        successfulLogins: 0,
        apiErrorRate: 0,
        systemHealth: 'healthy',
        uptime: Math.floor(process.uptime()),
      };

      return stats;
    } catch (error) {
      logger.error('Error fetching dashboard stats', { error });
      throw error;
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(offset: number = 0, limit: number = 50, filters?: Record<string, unknown>): Promise<{
    logs: AdminAuditLog[];
    total: number;
  }> {
    try {
      let query = 'SELECT id, action, admin, target_user, target_client, changes, timestamp, ip_address, user_agent FROM audit_logs';
      const params: unknown[] = [];

      if (filters?.action) {
        query += ' WHERE action = $' + (params.length + 1);
        params.push(filters.action);
      }

      if (filters?.admin) {
        const condition = ` AND admin = $${params.length + 1}`;
        query += params.length === 0 ? ' WHERE admin = $1' : condition;
        params.push(filters.admin);
      }

      const countResult = await database.query('SELECT COUNT(*) as count FROM audit_logs', []);
      const total = countResult.rows[0].count;

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      const logs: AdminAuditLog[] = result.rows.map((row: any) => ({
        id: row.id,
        action: row.action,
        admin: row.admin,
        targetUser: row.target_user,
        targetClient: row.target_client,
        changes: row.changes,
        timestamp: row.timestamp,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
      }));

      return { logs, total };
    } catch (error) {
      logger.error('Error fetching audit logs', { error });
      throw error;
    }
  }

  /**
   * Log admin audit event
   */
  private async logAuditEvent(event: {
    action: string;
    admin: string;
    targetUser?: string;
    targetClient?: string;
    changes: Record<string, unknown>;
  }): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await database.query(
        'INSERT INTO audit_logs (action, admin, target_user, target_client, changes, timestamp) ' +
        'VALUES ($1, $2, $3, $4, $5, $6)',
        [event.action, event.admin, event.targetUser, event.targetClient, JSON.stringify(event.changes), timestamp]
      );
    } catch (error) {
      logger.error('Error logging audit event', { error, event });
    }
  }

  /**
   * Generate random secret
   */
  private generateSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }
}

export const adminService = new AdminService();
