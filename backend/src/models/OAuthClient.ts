import { Pool } from 'pg';
import { getPool } from '../config/database';
import { OAuthClient } from '../types';
import { logger } from '../config/logger';

export class OAuthClientModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createClient(
    userId: string,
    name: string,
    redirectUris: string[],
    clientSecret: string,
    description?: string,
    allowedScopes?: string[],
  ): Promise<OAuthClient> {
    const query = `
      INSERT INTO oauth_clients (user_id, client_name, redirect_uris, client_secret, description, allowed_scopes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, user_id, client_name, redirect_uris, client_secret, description, allowed_scopes, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, [
        userId,
        name,
        JSON.stringify(redirectUris),
        clientSecret,
        description || null,
        allowedScopes ? JSON.stringify(allowedScopes) : JSON.stringify([]),
      ]);

      logger.debug(`OAuth client created: ${result.rows[0].id}`);
      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error creating OAuth client:', error);
      throw error;
    }
  }

  async findClientById(clientId: string): Promise<OAuthClient | null> {
    const query = `
      SELECT id, user_id, client_name, redirect_uris, client_secret, description, allowed_scopes, is_active, created_at, updated_at
      FROM oauth_clients
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [clientId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error finding OAuth client:', error);
      throw error;
    }
  }

  async findClientsByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<OAuthClient[]> {
    const query = `
      SELECT id, user_id, client_name, redirect_uris, client_secret, description, allowed_scopes, is_active, created_at, updated_at
      FROM oauth_clients
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [userId, limit, offset]);
      return result.rows.map((row) => this.mapRowToClient(row));
    } catch (error) {
      logger.error('Error finding OAuth clients by user ID:', error);
      throw error;
    }
  }

  async updateClient(
    clientId: string,
    updates: Partial<{
      name: string;
      redirectUris: string[];
      description: string;
      allowedScopes: string[];
      isActive: boolean;
    }>,
  ): Promise<OAuthClient> {
    const setClause: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (updates.name !== undefined) {
      setClause.push(`client_name = $${paramCounter++}`);
      values.push(updates.name);
    }
    if (updates.redirectUris !== undefined) {
      setClause.push(`redirect_uris = $${paramCounter++}`);
      values.push(JSON.stringify(updates.redirectUris));
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCounter++}`);
      values.push(updates.description);
    }
    if (updates.allowedScopes !== undefined) {
      setClause.push(`allowed_scopes = $${paramCounter++}`);
      values.push(JSON.stringify(updates.allowedScopes));
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCounter++}`);
      values.push(updates.isActive);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(clientId);

    const query = `
      UPDATE oauth_clients
      SET ${setClause.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, user_id, client_name, redirect_uris, client_secret, description, allowed_scopes, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`OAuth client not found: ${clientId}`);
      }
      logger.debug(`OAuth client updated: ${clientId}`);
      return this.mapRowToClient(result.rows[0]);
    } catch (error) {
      logger.error('Error updating OAuth client:', error);
      throw error;
    }
  }

  async deleteClient(clientId: string): Promise<void> {
    const query = `
      DELETE FROM oauth_clients
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [clientId]);
      if (result.rowCount === 0) {
        throw new Error(`OAuth client not found: ${clientId}`);
      }
      logger.debug(`OAuth client deleted: ${clientId}`);
    } catch (error) {
      logger.error('Error deleting OAuth client:', error);
      throw error;
    }
  }

  async activateClient(clientId: string): Promise<OAuthClient> {
    return this.updateClient(clientId, { isActive: true });
  }

  async deactivateClient(clientId: string): Promise<OAuthClient> {
    return this.updateClient(clientId, { isActive: false });
  }

  async verifyRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
    const query = `
      SELECT redirect_uris FROM oauth_clients WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [clientId]);
      if (result.rows.length === 0) {
        return false;
      }

      const redirectUris: string[] = JSON.parse(result.rows[0].redirect_uris);
      return redirectUris.includes(redirectUri);
    } catch (error) {
      logger.error('Error verifying redirect URI:', error);
      throw error;
    }
  }

  async getClientCount(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM oauth_clients';

    try {
      const result = await this.pool.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting client count:', error);
      throw error;
    }
  }

  private mapRowToClient(row: Record<string, unknown>): OAuthClient {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      clientName: String(row.client_name),
      redirectUris: JSON.parse(String(row.redirect_uris)) as string[],
      clientSecret: String(row.client_secret),
      description: row.description ? String(row.description) : undefined,
      allowedScopes: JSON.parse(String(row.allowed_scopes)) as string[],
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }
}

export const oauthClientModel = new OAuthClientModel();
