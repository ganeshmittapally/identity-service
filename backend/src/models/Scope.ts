import { Pool } from 'pg';
import { getPool } from '../config/database';
import { Scope } from '../types';
import { logger } from '../config/logger';

export class ScopeModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createScope(
    name: string,
    description?: string,
  ): Promise<Scope> {
    const query = `
      INSERT INTO scopes (scope_name, description, created_at, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, scope_name, description, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, [name, description || null]);
      logger.debug(`Scope created: ${result.rows[0].id}`);
      return this.mapRowToScope(result.rows[0]);
    } catch (error) {
      logger.error('Error creating scope:', error);
      throw error;
    }
  }

  async findScopeById(scopeId: string): Promise<Scope | null> {
    const query = `
      SELECT id, scope_name, description, is_active, created_at, updated_at
      FROM scopes
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [scopeId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToScope(result.rows[0]);
    } catch (error) {
      logger.error('Error finding scope:', error);
      throw error;
    }
  }

  async findScopeByName(name: string): Promise<Scope | null> {
    const query = `
      SELECT id, scope_name, description, is_active, created_at, updated_at
      FROM scopes
      WHERE scope_name = $1
    `;

    try {
      const result = await this.pool.query(query, [name]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToScope(result.rows[0]);
    } catch (error) {
      logger.error('Error finding scope by name:', error);
      throw error;
    }
  }

  async findScopesByIds(scopeIds: string[]): Promise<Scope[]> {
    if (scopeIds.length === 0) {
      return [];
    }

    const placeholders = scopeIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT id, scope_name, description, is_active, created_at, updated_at
      FROM scopes
      WHERE id IN (${placeholders})
    `;

    try {
      const result = await this.pool.query(query, scopeIds);
      return result.rows.map((row) => this.mapRowToScope(row));
    } catch (error) {
      logger.error('Error finding scopes by IDs:', error);
      throw error;
    }
  }

  async getAllScopes(limit: number = 100, offset: number = 0): Promise<Scope[]> {
    const query = `
      SELECT id, scope_name, description, is_active, created_at, updated_at
      FROM scopes
      WHERE is_active = true
      ORDER BY scope_name ASC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.pool.query(query, [limit, offset]);
      return result.rows.map((row) => this.mapRowToScope(row));
    } catch (error) {
      logger.error('Error getting all scopes:', error);
      throw error;
    }
  }

  async updateScope(
    scopeId: string,
    updates: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>,
  ): Promise<Scope> {
    const setClause: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (updates.name !== undefined) {
      setClause.push(`scope_name = $${paramCounter++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClause.push(`description = $${paramCounter++}`);
      values.push(updates.description);
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCounter++}`);
      values.push(updates.isActive);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(scopeId);

    const query = `
      UPDATE scopes
      SET ${setClause.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, scope_name, description, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`Scope not found: ${scopeId}`);
      }
      logger.debug(`Scope updated: ${scopeId}`);
      return this.mapRowToScope(result.rows[0]);
    } catch (error) {
      logger.error('Error updating scope:', error);
      throw error;
    }
  }

  async deleteScope(scopeId: string): Promise<void> {
    const query = `
      DELETE FROM scopes
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [scopeId]);
      if (result.rowCount === 0) {
        throw new Error(`Scope not found: ${scopeId}`);
      }
      logger.debug(`Scope deleted: ${scopeId}`);
    } catch (error) {
      logger.error('Error deleting scope:', error);
      throw error;
    }
  }

  private mapRowToScope(row: Record<string, unknown>): Scope {
    return {
      id: String(row.id),
      name: String(row.scope_name),
      description: row.description ? String(row.description) : undefined,
      isActive: Boolean(row.is_active),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }
}

export const scopeModel = new ScopeModel();
