import { Pool } from 'pg';
import { getPool } from '../config/database';
import { AccessToken } from '../types';
import { logger } from '../config/logger';

export class AccessTokenModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createAccessToken(
    userId: string,
    clientId: string,
    scopes: string[],
    tokenHash: string,
    expiresAt: Date,
  ): Promise<AccessToken> {
    const query = `
      INSERT INTO access_tokens (user_id, client_id, scopes, token_hash, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING id, user_id, client_id, scopes, token_hash, expires_at, created_at
    `;

    try {
      const result = await this.pool.query(query, [
        userId,
        clientId,
        JSON.stringify(scopes),
        tokenHash,
        expiresAt,
      ]);

      logger.debug(`Access token created for user: ${userId}`);
      return this.mapRowToAccessToken(result.rows[0]);
    } catch (error) {
      logger.error('Error creating access token:', error);
      throw error;
    }
  }

  async findAccessTokenById(tokenId: string): Promise<AccessToken | null> {
    const query = `
      SELECT id, user_id, client_id, scopes, token_hash, expires_at, created_at
      FROM access_tokens
      WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.pool.query(query, [tokenId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToAccessToken(result.rows[0]);
    } catch (error) {
      logger.error('Error finding access token:', error);
      throw error;
    }
  }

  async findAccessTokenByHash(tokenHash: string): Promise<AccessToken | null> {
    const query = `
      SELECT id, user_id, client_id, scopes, token_hash, expires_at, created_at
      FROM access_tokens
      WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.pool.query(query, [tokenHash]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToAccessToken(result.rows[0]);
    } catch (error) {
      logger.error('Error finding access token by hash:', error);
      throw error;
    }
  }

  async findAccessTokensByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AccessToken[]> {
    const query = `
      SELECT id, user_id, client_id, scopes, token_hash, expires_at, created_at
      FROM access_tokens
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [userId, limit, offset]);
      return result.rows.map((row) => this.mapRowToAccessToken(row));
    } catch (error) {
      logger.error('Error finding access tokens by user:', error);
      throw error;
    }
  }

  async findAccessTokensByClientId(
    clientId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<AccessToken[]> {
    const query = `
      SELECT id, user_id, client_id, scopes, token_hash, expires_at, created_at
      FROM access_tokens
      WHERE client_id = $1 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.pool.query(query, [clientId, limit, offset]);
      return result.rows.map((row) => this.mapRowToAccessToken(row));
    } catch (error) {
      logger.error('Error finding access tokens by client:', error);
      throw error;
    }
  }

  async revokeAccessToken(tokenId: string): Promise<void> {
    const query = `
      UPDATE access_tokens
      SET expires_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [tokenId]);
      logger.debug(`Access token revoked: ${tokenId}`);
    } catch (error) {
      logger.error('Error revoking access token:', error);
      throw error;
    }
  }

  async revokeAccessTokensByUserId(userId: string): Promise<void> {
    const query = `
      UPDATE access_tokens
      SET expires_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      logger.debug(`Revoked ${result.rowCount} access tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking access tokens by user:', error);
      throw error;
    }
  }

  async revokeAccessTokensByClientId(clientId: string): Promise<void> {
    const query = `
      UPDATE access_tokens
      SET expires_at = CURRENT_TIMESTAMP
      WHERE client_id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.pool.query(query, [clientId]);
      logger.debug(`Revoked ${result.rowCount} access tokens for client: ${clientId}`);
    } catch (error) {
      logger.error('Error revoking access tokens by client:', error);
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      DELETE FROM access_tokens
      WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `;

    try {
      const result = await this.pool.query(query);
      logger.debug(`Cleaned up ${result.rowCount} expired access tokens`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  private mapRowToAccessToken(row: Record<string, unknown>): AccessToken {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      clientId: String(row.client_id),
      scopes: JSON.parse(String(row.scopes)) as string[],
      tokenHash: String(row.token_hash),
      expiresAt: new Date(String(row.expires_at)),
      createdAt: new Date(String(row.created_at)),
    };
  }
}

export const accessTokenModel = new AccessTokenModel();
