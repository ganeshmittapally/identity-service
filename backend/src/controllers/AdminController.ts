import { Request, Response } from 'express';
import { adminService, AdminDashboardStats } from '../services/AdminService';
import { logger } from '../config/logger';

/**
 * Admin Controller
 * Handles all admin dashboard operations
 */
export class AdminController {
  /**
   * GET /api/v1/admin/users
   * List all users with pagination and filtering
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const filters = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;

      const result = await adminService.getAllUsers(offset, limit, filters);

      res.json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            offset,
            limit,
            total: result.total,
            hasMore: offset + limit < result.total,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching users', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
      });
    }
  }

  /**
   * GET /api/v1/admin/clients
   * List all OAuth clients with pagination and filtering
   */
  async getClients(req: Request, res: Response): Promise<void> {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const filters = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;

      const result = await adminService.getAllClients(offset, limit, filters);

      res.json({
        success: true,
        data: {
          clients: result.clients,
          pagination: {
            offset,
            limit,
            total: result.total,
            hasMore: offset + limit < result.total,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching clients', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch clients',
      });
    }
  }

  /**
   * POST /api/v1/admin/users/:userId/suspend
   * Suspend a user account
   */
  async suspendUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { durationMinutes = 1440, reason = 'Administrative action' } = req.body;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const success = await adminService.suspendUser(userId, durationMinutes, reason, adminId);

      res.json({
        success,
        data: {
          userId,
          status: 'suspended',
          suspendedUntil: new Date(Date.now() + durationMinutes * 60000).toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error suspending user', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to suspend user',
      });
    }
  }

  /**
   * POST /api/v1/admin/users/:userId/unsuspend
   * Unsuspend a user account
   */
  async unsuspendUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const success = await adminService.unsuspendUser(userId, adminId);

      res.json({
        success,
        data: {
          userId,
          status: 'active',
        },
      });
    } catch (error) {
      logger.error('Error unsuspending user', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to unsuspend user',
      });
    }
  }

  /**
   * POST /api/v1/admin/users/:userId/reset-login-attempts
   * Reset user login attempts
   */
  async resetLoginAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await adminService.resetLoginAttempts(userId, adminId);

      res.json({
        success: true,
        data: {
          userId,
          loginAttempts: 0,
        },
      });
    } catch (error) {
      logger.error('Error resetting login attempts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset login attempts',
      });
    }
  }

  /**
   * POST /api/v1/admin/clients/:clientId/revoke
   * Revoke an OAuth client
   */
  async revokeClient(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const { reason = 'Administrative action' } = req.body;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      await adminService.revokeClient(clientId, reason, adminId);

      res.json({
        success: true,
        data: {
          clientId,
          status: 'revoked',
          revokedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error revoking client', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to revoke client',
      });
    }
  }

  /**
   * POST /api/v1/admin/clients/:clientId/reset-secret
   * Reset client secret
   */
  async resetClientSecret(req: Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const newSecret = await adminService.resetClientSecret(clientId, adminId);

      res.json({
        success: true,
        data: {
          clientId,
          newSecret,
          secretResetAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error resetting client secret', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to reset client secret',
      });
    }
  }

  /**
   * GET /api/v1/admin/config
   * Get system configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = await adminService.getSystemConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error fetching config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch configuration',
      });
    }
  }

  /**
   * PATCH /api/v1/admin/config
   * Update system configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;

      if (!adminId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const updates = req.body;
      const config = await adminService.updateSystemConfig(updates, adminId);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      logger.error('Error updating config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  }

  /**
   * GET /api/v1/admin/dashboard
   * Get dashboard statistics and system health
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const stats: AdminDashboardStats = await adminService.getDashboardStats();

      res.json({
        success: true,
        data: {
          stats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
      });
    }
  }

  /**
   * GET /api/v1/admin/audit-logs
   * Get audit logs with pagination and filtering
   */
  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const filters = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;

      const result = await adminService.getAuditLogs(offset, limit, filters);

      res.json({
        success: true,
        data: {
          logs: result.logs,
          pagination: {
            offset,
            limit,
            total: result.total,
            hasMore: offset + limit < result.total,
          },
        },
      });
    } catch (error) {
      logger.error('Error fetching audit logs', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch audit logs',
      });
    }
  }
}

export const adminController = new AdminController();
