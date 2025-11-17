import { Pool, PoolClient } from 'pg';
import { getPool } from '../config/database';
import { User } from '../types';
import { logger } from '../config/logger';

export class UserModel {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createUser(
    email: string,
    username: string,
    passwordHash: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    const query = `
      INSERT INTO users (email, username, password_hash, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, username, first_name, last_name, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, [
        email,
        username,
        passwordHash,
        firstName || null,
        lastName || null,
      ]);

      logger.debug(`User created: ${email}`);
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async findUserById(userId: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    try {
      const result = await this.pool.query(query, [email]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findUserByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, is_active, created_at, updated_at
      FROM users
      WHERE username = $1
    `;

    try {
      const result = await this.pool.query(query, [username]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  async updateUser(
    userId: string,
    updates: Partial<{
      email: string;
      username: string;
      passwordHash: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
    }>,
  ): Promise<User> {
    const allowedFields = ['email', 'username', 'password_hash', 'first_name', 'last_name', 'is_active'];
    const setClause: string[] = [];
    const values: unknown[] = [];
    let paramCounter = 1;

    if (updates.email !== undefined) {
      setClause.push(`email = $${paramCounter++}`);
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      setClause.push(`username = $${paramCounter++}`);
      values.push(updates.username);
    }
    if (updates.passwordHash !== undefined) {
      setClause.push(`password_hash = $${paramCounter++}`);
      values.push(updates.passwordHash);
    }
    if (updates.firstName !== undefined) {
      setClause.push(`first_name = $${paramCounter++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setClause.push(`last_name = $${paramCounter++}`);
      values.push(updates.lastName);
    }
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramCounter++}`);
      values.push(updates.isActive);
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING id, email, username, first_name, last_name, is_active, created_at, updated_at
    `;

    try {
      const result = await this.pool.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`User not found: ${userId}`);
      }
      logger.debug(`User updated: ${userId}`);
      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const query = `
      DELETE FROM users
      WHERE id = $1
    `;

    try {
      const result = await this.pool.query(query, [userId]);
      if (result.rowCount === 0) {
        throw new Error(`User not found: ${userId}`);
      }
      logger.debug(`User deleted: ${userId}`);
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
    const query = `
      SELECT id, email, username, password_hash, first_name, last_name, is_active, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.pool.query(query, [limit, offset]);
      return result.rows.map((row) => this.mapRowToUser(row));
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  async activateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { isActive: true });
  }

  async deactivateUser(userId: string): Promise<User> {
    return this.updateUser(userId, { isActive: false });
  }

  async getUserCount(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users';

    try {
      const result = await this.pool.query(query);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error getting user count:', error);
      throw error;
    }
  }

  private mapRowToUser(row: Record<string, unknown>): User {
    return {
      id: String(row.id),
      email: String(row.email),
      password_hash: String(row.password_hash),
      first_name: row.first_name ? String(row.first_name) : null,
      last_name: row.last_name ? String(row.last_name) : null,
      is_active: Boolean(row.is_active),
      created_at: new Date(String(row.created_at)),
      updated_at: new Date(String(row.updated_at)),
    };
  }
}

export const userModel = new UserModel();
