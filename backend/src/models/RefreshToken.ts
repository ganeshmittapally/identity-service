import { Pool } from 'pg';
import { getPool } from '../config/database';
import { RefreshToken } from '../types';
import { logger } from '../config/logger';

export class RefreshTokenModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createRefreshToken(
    userId: string,
    clientId: string,
    tokenHash: string,
    accessTokenId: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    const query = `
      INSERT INTO refresh_tokens (user_id, client_id, token_hash, access_token_id, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING id, user_id, client_id, token_hash, access_token_id, expires_at, is_revoked, created_at
    `;

    try {
      const result = await this.pool.query(query, [
        userId,
        clientId,
        tokenHash,
        accessTokenId,
        expiresAt,
      ]);

      logger.debug(`Refresh token created for user: ${userId}`);
      return this.mapRowToRefreshToken(result.rows[0]);
    } catch (error) {
      logger.error('Error creating refresh token:', error);
      throw error;
    }
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    const query = `
      SELECT id, user_id, client_id, token_hash, access_token_id, expires_at, is_revoked, created_at
      FROM refresh_tokens
      WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND is_revoked = false
    `;

    try {
      const result = await this.pool.query(query, [tokenHash]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToRefreshToken(result.rows[0]);
    } catch (error) {
      logger.error('Error finding refresh token by hash:', error);
      throw error;
    }
  }

  async findRefreshTokenById(tokenId: string): Promise<RefreshToken | null> {
    const query = `
      SELECT id, user_id, client_id, token_hash, access_token_id, expires_at, is_revoked, created_at
      FROM refresh_tokens
      WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_revoked = false
    `;

    try {
      const result = await this.pool.query(query, [tokenId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToRefreshToken(result.rows[0]);
    } catch (error) {
      logger.error('Error finding refresh token by ID:', error);
      throw error;
    }
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [tokenId]);
      logger.debug(`Refresh token revoked: ${tokenId}`);
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  async revokeRefreshTokensByUserId(userId: string): Promise<void> {
    const query = `
      UPDATE refresh_tokens
      SET is_revoked = true
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      logger.debug(`Revoked ${result.rowCount} refresh tokens for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking refresh tokens by user:', error);
      throw error;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `;

    try {
      const result = await this.pool.query(query);
      logger.debug(`Cleaned up ${result.rowCount} expired refresh tokens`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  private mapRowToRefreshToken(row: Record<string, unknown>): RefreshToken {
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      client_id: String(row.client_id),
      token_hash: String(row.token_hash),
      access_token_id: String(row.access_token_id),
      expires_at: new Date(String(row.expires_at)),
      is_revoked: Boolean(row.is_revoked),
      created_at: new Date(String(row.created_at)),
    };
  }
}

export const refreshTokenModel = new RefreshTokenModel();
