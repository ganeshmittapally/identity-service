import crypto from 'crypto';
import { oauthClientModel } from '../models/OAuthClient';
import { logger } from '../config/logger';
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../types';
import type { OAuthClient } from '../types';

/**
 * OAuth Client Service
 * Handles OAuth client management, CRUD operations
 */
export class ClientService {
  /**
   * Register new OAuth client
   * @param userId User ID (client owner)
   * @param clientName Client application name
   * @param redirectUris Array of allowed redirect URIs
   * @param description Optional client description
   * @param allowedScopes Scopes this client is allowed to request
   * @returns Created client with generated credentials
   */
  async registerClient(
    userId: string,
    clientName: string,
    redirectUris: string[],
    description?: string,
    allowedScopes?: string[],
  ): Promise<OAuthClient & { client_secret: string }> {
    // Generate unique client ID
    const clientId = `client_${crypto.randomBytes(16).toString('hex')}`;

    // Generate secure client secret (never generate this twice - clients must store it)
    const clientSecret = crypto.randomBytes(32).toString('hex');

    // Create client in database
    const client = await oauthClientModel.createClient(
      userId,
      clientName,
      redirectUris,
      clientSecret,
      description,
      allowedScopes || [],
    );

    logger.info(`OAuth client registered - ID: ${clientId}, Owner: ${userId}`);

    return {
      ...client,
      client_secret: clientSecret,
    };
  }

  /**
   * Get client details
   * @param clientId Client ID
   * @param userId Optional user ID for ownership check
   * @returns Client details
   */
  async getClient(clientId: string, userId?: string): Promise<OAuthClient> {
    const client = await oauthClientModel.findClientById(clientId);
    if (!client) {
      throw new NotFoundError(`Client not found: ${clientId}`);
    }

    // If userId provided, verify ownership
    if (userId && client.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to access this client');
    }

    return client;
  }

  /**
   * List clients for user
   * @param userId User ID
   * @param limit Number of results
   * @param offset Query offset
   * @returns Array of clients
   */
  async listClientsForUser(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<OAuthClient[]> {
    return oauthClientModel.findClientsByUserId(userId, limit, offset);
  }

  /**
   * Update client settings
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @param updates Client updates
   * @returns Updated client
   */
  async updateClient(
    clientId: string,
    userId: string,
    updates: {
      client_name?: string;
      redirect_uris?: string[];
      description?: string;
      allowed_scopes?: string[];
    },
  ): Promise<OAuthClient> {
    // Get client and verify ownership
    const client = await this.getClient(clientId, userId);

    // Update client
    const updatedClient = await oauthClientModel.updateClient(clientId, {
      ...(updates.client_name && { name: updates.client_name }),
      ...(updates.redirect_uris && { redirectUris: updates.redirect_uris }),
      ...(updates.description && { description: updates.description }),
      ...(updates.allowed_scopes && { allowedScopes: updates.allowed_scopes }),
    });

    logger.info(`Client updated - ID: ${clientId}`);

    return updatedClient;
  }

  /**
   * Delete client
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   */
  async deleteClient(clientId: string, userId: string): Promise<void> {
    // Get client and verify ownership
    await this.getClient(clientId, userId);

    // Delete client
    await oauthClientModel.deleteClient(clientId);

    logger.info(`Client deleted - ID: ${clientId}`);
  }

  /**
   * Activate client
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   */
  async activateClient(clientId: string, userId: string): Promise<void> {
    // Get client and verify ownership
    await this.getClient(clientId, userId);

    // Activate client
    await oauthClientModel.activateClient(clientId);

    logger.info(`Client activated - ID: ${clientId}`);
  }

  /**
   * Deactivate client
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   */
  async deactivateClient(clientId: string, userId: string): Promise<void> {
    // Get client and verify ownership
    await this.getClient(clientId, userId);

    // Deactivate client
    await oauthClientModel.deactivateClient(clientId);

    logger.info(`Client deactivated - ID: ${clientId}`);
  }

  /**
   * Rotate client secret (generates new secret and invalidates old one)
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @returns New client secret
   */
  async rotateClientSecret(clientId: string, userId: string): Promise<string> {
    // Get client and verify ownership
    await this.getClient(clientId, userId);

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Update client with new secret
    await oauthClientModel.updateClient(clientId, { clientSecret: newSecret });

    logger.info(`Client secret rotated - ID: ${clientId}`);

    return newSecret;
  }

  /**
   * Add redirect URI to client
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @param redirectUri URI to add
   */
  async addRedirectUri(clientId: string, userId: string, redirectUri: string): Promise<void> {
    // Get client and verify ownership
    const client = await this.getClient(clientId, userId);

    // Check if URI already exists
    if ((client.redirect_uris as string[]).includes(redirectUri)) {
      throw new ForbiddenError('Redirect URI already added to client');
    }

    // Add URI
    const updatedUris = [...(client.redirect_uris as string[]), redirectUri];
    await oauthClientModel.updateClient(clientId, { redirectUris: updatedUris });

    logger.info(`Redirect URI added to client - ID: ${clientId}`);
  }

  /**
   * Remove redirect URI from client
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @param redirectUri URI to remove
   */
  async removeRedirectUri(clientId: string, userId: string, redirectUri: string): Promise<void> {
    // Get client and verify ownership
    const client = await this.getClient(clientId, userId);

    // Find and remove URI
    const updatedUris = (client.redirect_uris as string[]).filter((uri) => uri !== redirectUri);

    if (updatedUris.length === (client.redirect_uris as string[]).length) {
      throw new NotFoundError('Redirect URI not found for this client');
    }

    // Must have at least one redirect URI
    if (updatedUris.length === 0) {
      throw new ForbiddenError('Client must have at least one redirect URI');
    }

    await oauthClientModel.updateClient(clientId, { redirectUris: updatedUris });

    logger.info(`Redirect URI removed from client - ID: ${clientId}`);
  }

  /**
   * Add scope to client allowed scopes
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @param scope Scope to add
   */
  async addScope(clientId: string, userId: string, scope: string): Promise<void> {
    // Get client and verify ownership
    const client = await this.getClient(clientId, userId);

    // Check if scope already exists
    if ((client.allowed_scopes as string[]).includes(scope)) {
      throw new ForbiddenError('Scope already added to client');
    }

    // Add scope
    const updatedScopes = [...(client.allowed_scopes as string[]), scope];
    await oauthClientModel.updateClient(clientId, { allowedScopes: updatedScopes });

    logger.info(`Scope added to client - ID: ${clientId}, Scope: ${scope}`);
  }

  /**
   * Remove scope from client allowed scopes
   * @param clientId Client ID
   * @param userId User ID (for ownership verification)
   * @param scope Scope to remove
   */
  async removeScope(clientId: string, userId: string, scope: string): Promise<void> {
    // Get client and verify ownership
    const client = await this.getClient(clientId, userId);

    // Find and remove scope
    const updatedScopes = (client.allowed_scopes as string[]).filter((s) => s !== scope);

    if (updatedScopes.length === (client.allowed_scopes as string[]).length) {
      throw new NotFoundError('Scope not found in client allowed scopes');
    }

    await oauthClientModel.updateClient(clientId, { allowedScopes: updatedScopes });

    logger.info(`Scope removed from client - ID: ${clientId}, Scope: ${scope}`);
  }
}

export const clientService = new ClientService();
