import { Pool } from 'pg';
import { getPool } from '../config/database';
import { AuthorizationCode } from '../types';
import { logger } from '../config/logger';

export class AuthorizationCodeModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createAuthorizationCode(
    userId: string,
    clientId: string,
    codeHash: string,
    redirectUri: string,
    scopes: string[],
    expiresAt: Date,
  ): Promise<AuthorizationCode> {
    const query = `
      INSERT INTO authorization_codes (user_id, client_id, code_hash, redirect_uri, scopes, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id, user_id, client_id, code_hash, redirect_uri, scopes, expires_at, is_used, created_at
    `;

    try {
      const result = await this.pool.query(query, [
        userId,
        clientId,
        codeHash,
        redirectUri,
        JSON.stringify(scopes),
        expiresAt,
      ]);

      logger.debug(`Authorization code created for client: ${clientId}`);
      return this.mapRowToAuthorizationCode(result.rows[0]);
    } catch (error) {
      logger.error('Error creating authorization code:', error);
      throw error;
    }
  }

  async findAuthorizationCodeByHash(codeHash: string): Promise<AuthorizationCode | null> {
    const query = `
      SELECT id, user_id, client_id, code_hash, redirect_uri, scopes, expires_at, is_used, created_at
      FROM authorization_codes
      WHERE code_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND is_used = false
    `;

    try {
      const result = await this.pool.query(query, [codeHash]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToAuthorizationCode(result.rows[0]);
    } catch (error) {
      logger.error('Error finding authorization code by hash:', error);
      throw error;
    }
  }

  async markAuthorizationCodeAsUsed(codeId: string): Promise<void> {
    const query = `
      UPDATE authorization_codes
      SET is_used = true
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [codeId]);
      logger.debug(`Authorization code marked as used: ${codeId}`);
    } catch (error) {
      logger.error('Error marking authorization code as used:', error);
      throw error;
    }
  }

  async revokeAuthorizationCode(codeId: string): Promise<void> {
    const query = `
      UPDATE authorization_codes
      SET expires_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [codeId]);
      logger.debug(`Authorization code revoked: ${codeId}`);
    } catch (error) {
      logger.error('Error revoking authorization code:', error);
      throw error;
    }
  }

  async revokeAuthorizationCodesByUserId(userId: string): Promise<void> {
    const query = `
      UPDATE authorization_codes
      SET expires_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP AND is_used = false
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      logger.debug(`Revoked ${result.rowCount} authorization codes for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking authorization codes by user:', error);
      throw error;
    }
  }

  async cleanupExpiredCodes(): Promise<number> {
    const query = `
      DELETE FROM authorization_codes
      WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `;

    try {
      const result = await this.pool.query(query);
      logger.debug(`Cleaned up ${result.rowCount} expired authorization codes`);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error cleaning up expired codes:', error);
      throw error;
    }
  }

  private mapRowToAuthorizationCode(row: Record<string, unknown>): AuthorizationCode {
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      client_id: String(row.client_id),
      code_hash: String(row.code_hash),
      redirect_uri: String(row.redirect_uri),
      scopes: JSON.parse(String(row.scopes)) as string[],
      expires_at: new Date(String(row.expires_at)),
      is_used: Boolean(row.is_used),
      created_at: new Date(String(row.created_at)),
    };
  }
}

export const authorizationCodeModel = new AuthorizationCodeModel();
