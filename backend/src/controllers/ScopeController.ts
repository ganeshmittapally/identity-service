import { Request, Response, NextFunction } from 'express';
import { scopeModel } from '../models/Scope';
import { logger } from '../config/logger';
import { UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../types';

export class ScopeController {
  /**
   * List all available scopes
   * GET /api/v1/scopes
   */
  async listScopes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const scopes = await scopeModel.findAllScopes(
        parseInt(limit as string, 10),
        parseInt(offset as string, 10),
      );

      res.status(200).json({
        status: 'success',
        data: {
          scopes: scopes.map((s) => ({
            id: s.id,
            scope_name: s.scope_name,
            description: s.description,
            is_active: s.is_active,
            created_at: s.created_at,
          })),
          pagination: {
            limit: parseInt(limit as string, 10),
            offset: parseInt(offset as string, 10),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific scope details
   * GET /api/v1/scopes/:scopeId
   */
  async getScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { scopeId } = req.params;

      const scope = await scopeModel.findScopeById(scopeId);
      if (!scope) {
        throw new NotFoundError(`Scope not found: ${scopeId}`);
      }

      res.status(200).json({
        status: 'success',
        data: {
          scope: {
            id: scope.id,
            scope_name: scope.scope_name,
            description: scope.description,
            is_active: scope.is_active,
            created_at: scope.created_at,
            updated_at: scope.updated_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new scope (admin only)
   * POST /api/v1/scopes
   * Requires: Bearer token in Authorization header, admin role
   */
  async createScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as any).isAdmin;
      const { scope_name, description } = req.body;

      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can create scopes');
      }

      // Check if scope already exists
      const existingScope = await scopeModel.findScopeByName(scope_name);
      if (existingScope) {
        throw new ConflictError(`Scope already exists: ${scope_name}`);
      }

      const scope = await scopeModel.createScope(scope_name, description);

      logger.info(`Scope created: ${scope_name}`);

      res.status(201).json({
        status: 'success',
        data: {
          scope: {
            id: scope.id,
            scope_name: scope.scope_name,
            description: scope.description,
            is_active: scope.is_active,
            created_at: scope.created_at,
          },
        },
        message: 'Scope created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update scope (admin only)
   * PUT /api/v1/scopes/:scopeId
   * Requires: Bearer token in Authorization header, admin role
   */
  async updateScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as any).isAdmin;
      const { scopeId } = req.params;
      const { scope_name, description } = req.body;

      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can update scopes');
      }

      const scope = await scopeModel.findScopeById(scopeId);
      if (!scope) {
        throw new NotFoundError(`Scope not found: ${scopeId}`);
      }

      // Check if new name conflicts with existing scope
      if (scope_name && scope_name !== scope.scope_name) {
        const existingScope = await scopeModel.findScopeByName(scope_name);
        if (existingScope) {
          throw new ConflictError(`Scope name already exists: ${scope_name}`);
        }
      }

      const updates: any = {};
      if (scope_name) updates.name = scope_name;
      if (description) updates.description = description;

      const updatedScope = await scopeModel.updateScope(scopeId, updates);

      logger.info(`Scope updated: ${scopeId}`);

      res.status(200).json({
        status: 'success',
        data: {
          scope: {
            id: updatedScope.id,
            scope_name: updatedScope.scope_name,
            description: updatedScope.description,
            is_active: updatedScope.is_active,
            created_at: updatedScope.created_at,
            updated_at: updatedScope.updated_at,
          },
        },
        message: 'Scope updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete scope (admin only)
   * DELETE /api/v1/scopes/:scopeId
   * Requires: Bearer token in Authorization header, admin role
   */
  async deleteScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as any).isAdmin;
      const { scopeId } = req.params;

      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can delete scopes');
      }

      const scope = await scopeModel.findScopeById(scopeId);
      if (!scope) {
        throw new NotFoundError(`Scope not found: ${scopeId}`);
      }

      await scopeModel.deleteScope(scopeId);

      logger.info(`Scope deleted: ${scopeId}`);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate scope (admin only)
   * POST /api/v1/scopes/:scopeId/activate
   * Requires: Bearer token in Authorization header, admin role
   */
  async activateScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as any).isAdmin;
      const { scopeId } = req.params;

      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can activate scopes');
      }

      const scope = await scopeModel.findScopeById(scopeId);
      if (!scope) {
        throw new NotFoundError(`Scope not found: ${scopeId}`);
      }

      await scopeModel.activateScope(scopeId);

      logger.info(`Scope activated: ${scopeId}`);

      res.status(200).json({
        status: 'success',
        message: 'Scope activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate scope (admin only)
   * POST /api/v1/scopes/:scopeId/deactivate
   * Requires: Bearer token in Authorization header, admin role
   */
  async deactivateScope(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const isAdmin = (req as any).isAdmin;
      const { scopeId } = req.params;

      if (!isAdmin) {
        throw new ForbiddenError('Only administrators can deactivate scopes');
      }

      const scope = await scopeModel.findScopeById(scopeId);
      if (!scope) {
        throw new NotFoundError(`Scope not found: ${scopeId}`);
      }

      await scopeModel.deactivateScope(scopeId);

      logger.info(`Scope deactivated: ${scopeId}`);

      res.status(200).json({
        status: 'success',
        message: 'Scope deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const scopeController = new ScopeController();
