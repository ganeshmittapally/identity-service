import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { oauthClientModel } from '../models/OAuthClient';
import { logger } from '../config/logger';
import { UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../types';

export class ClientController {
  /**
   * Register a new OAuth client
   * POST /api/v1/clients
   * Requires: Bearer token in Authorization header
   */
  async registerClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { client_name, redirect_uris, description, allowed_scopes } = req.body;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      // Generate client ID and secret
      const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;
      const clientSecret = crypto.randomBytes(32).toString('hex');

      // Create client
      const client = await oauthClientModel.createClient(
        userId,
        client_name,
        redirect_uris,
        clientSecret,
        description,
        allowed_scopes,
      );

      logger.info(`OAuth client registered: ${clientId}`);

      res.status(201).json({
        status: 'success',
        data: {
          client: {
            id: client.id,
            client_id: clientId,
            client_secret: clientSecret,
            client_name: client.client_name,
            redirect_uris: client.redirect_uris,
            allowed_scopes: client.allowed_scopes,
            description: client.description,
            created_at: client.created_at,
          },
        },
        message: 'Client registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get client details
   * GET /api/v1/clients/:clientId
   * Requires: Bearer token in Authorization header
   */
  async getClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { clientId } = req.params;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const client = await oauthClientModel.findClientById(clientId);
      if (!client) {
        throw new NotFoundError(`Client not found: ${clientId}`);
      }

      // Verify ownership
      if (client.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to access this client');
      }

      res.status(200).json({
        status: 'success',
        data: {
          client: {
            id: client.id,
            client_name: client.client_name,
            redirect_uris: client.redirect_uris,
            allowed_scopes: client.allowed_scopes,
            description: client.description,
            is_active: client.is_active,
            created_at: client.created_at,
            updated_at: client.updated_at,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List user's OAuth clients
   * GET /api/v1/clients
   * Requires: Bearer token in Authorization header
   */
  async listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { limit = 50, offset = 0 } = req.query;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const clients = await oauthClientModel.findClientsByUserId(
        userId,
        parseInt(limit as string, 10),
        parseInt(offset as string, 10),
      );

      res.status(200).json({
        status: 'success',
        data: {
          clients: clients.map((c) => ({
            id: c.id,
            client_name: c.client_name,
            redirect_uris: c.redirect_uris,
            allowed_scopes: c.allowed_scopes,
            is_active: c.is_active,
            created_at: c.created_at,
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
   * Update OAuth client
   * PUT /api/v1/clients/:clientId
   * Requires: Bearer token in Authorization header
   */
  async updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { clientId } = req.params;
      const { client_name, redirect_uris, description, allowed_scopes } = req.body;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const client = await oauthClientModel.findClientById(clientId);
      if (!client) {
        throw new NotFoundError(`Client not found: ${clientId}`);
      }

      // Verify ownership
      if (client.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to update this client');
      }

      const updates: any = {};
      if (client_name) updates.name = client_name;
      if (redirect_uris) updates.redirectUris = redirect_uris;
      if (description) updates.description = description;
      if (allowed_scopes) updates.allowedScopes = allowed_scopes;

      const updatedClient = await oauthClientModel.updateClient(clientId, updates);

      logger.info(`OAuth client updated: ${clientId}`);

      res.status(200).json({
        status: 'success',
        data: {
          client: {
            id: updatedClient.id,
            client_name: updatedClient.client_name,
            redirect_uris: updatedClient.redirect_uris,
            allowed_scopes: updatedClient.allowed_scopes,
            description: updatedClient.description,
            is_active: updatedClient.is_active,
            created_at: updatedClient.created_at,
            updated_at: updatedClient.updated_at,
          },
        },
        message: 'Client updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete OAuth client
   * DELETE /api/v1/clients/:clientId
   * Requires: Bearer token in Authorization header
   */
  async deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { clientId } = req.params;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const client = await oauthClientModel.findClientById(clientId);
      if (!client) {
        throw new NotFoundError(`Client not found: ${clientId}`);
      }

      // Verify ownership
      if (client.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to delete this client');
      }

      await oauthClientModel.deleteClient(clientId);

      logger.info(`OAuth client deleted: ${clientId}`);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activate client
   * POST /api/v1/clients/:clientId/activate
   * Requires: Bearer token in Authorization header
   */
  async activateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { clientId } = req.params;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const client = await oauthClientModel.findClientById(clientId);
      if (!client) {
        throw new NotFoundError(`Client not found: ${clientId}`);
      }

      if (client.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to activate this client');
      }

      await oauthClientModel.activateClient(clientId);

      logger.info(`OAuth client activated: ${clientId}`);

      res.status(200).json({
        status: 'success',
        message: 'Client activated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate client
   * POST /api/v1/clients/:clientId/deactivate
   * Requires: Bearer token in Authorization header
   */
  async deactivateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { clientId } = req.params;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const client = await oauthClientModel.findClientById(clientId);
      if (!client) {
        throw new NotFoundError(`Client not found: ${clientId}`);
      }

      if (client.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to deactivate this client');
      }

      await oauthClientModel.deactivateClient(clientId);

      logger.info(`OAuth client deactivated: ${clientId}`);

      res.status(200).json({
        status: 'success',
        message: 'Client deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const clientController = new ClientController();
