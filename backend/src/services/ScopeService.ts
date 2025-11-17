import { scopeModel } from '../models/Scope';
import { logger } from '../config/logger';
import { NotFoundError, ConflictError, ForbiddenError } from '../types';
import type { Scope } from '../types';

/**
 * Scope Service
 * Handles scope management and validation
 */
export class ScopeService {
  /**
   * Get all scopes
   * @param limit Number of results
   * @param offset Query offset
   * @returns Array of scopes
   */
  async getAllScopes(limit: number = 100, offset: number = 0): Promise<Scope[]> {
    // TODO: Implement scopeModel.findAllScopes method
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Get scope by ID
   * @param scopeId Scope ID
   * @returns Scope details
   */
  async getScope(scopeId: string): Promise<Scope> {
    const scope = await scopeModel.findScopeById(scopeId);
    if (!scope) {
      throw new NotFoundError(`Scope not found: ${scopeId}`);
    }

    return scope;
  }

  /**
   * Get scope by name
   * @param scopeName Scope name
   * @returns Scope details
   */
  async getScopeByName(scopeName: string): Promise<Scope | null> {
    return scopeModel.findScopeByName(scopeName);
  }

  /**
   * Create new scope (admin only)
   * @param scopeName Unique scope name
   * @param description Scope description
   * @returns Created scope
   */
  async createScope(scopeName: string, description?: string): Promise<Scope> {
    // Check if scope already exists
    const existingScope = await this.getScopeByName(scopeName);
    if (existingScope) {
      throw new ConflictError(`Scope already exists: ${scopeName}`);
    }

    // Create scope
    const scope = await scopeModel.createScope(scopeName, description);

    logger.info(`Scope created: ${scopeName}`);

    return scope;
  }

  /**
   * Update scope (admin only)
   * @param scopeId Scope ID
   * @param updates Scope updates
   * @returns Updated scope
   */
  async updateScope(
    scopeId: string,
    updates: {
      scope_name?: string;
      description?: string;
    },
  ): Promise<Scope> {
    // Get scope
    const scope = await this.getScope(scopeId);

    // Check if new name conflicts with existing scope
    if (updates.scope_name && updates.scope_name !== scope.scope_name) {
      const existingScope = await this.getScopeByName(updates.scope_name);
      if (existingScope) {
        throw new ConflictError(`Scope name already exists: ${updates.scope_name}`);
      }
    }

    // Update scope
    const updatedScope = await scopeModel.updateScope(scopeId, {
      ...(updates.scope_name && { name: updates.scope_name }),
      ...(updates.description && { description: updates.description }),
    });

    logger.info(`Scope updated: ${scopeId}`);

    return updatedScope;
  }

  /**
   * Delete scope (admin only)
   * @param scopeId Scope ID
   */
  async deleteScope(scopeId: string): Promise<void> {
    // Get scope (verify it exists)
    await this.getScope(scopeId);

    // Delete scope
    await scopeModel.deleteScope(scopeId);

    logger.info(`Scope deleted: ${scopeId}`);
  }

  /**
   * Activate scope (admin only)
   * @param scopeId Scope ID
   */
  async activateScope(scopeId: string): Promise<void> {
    // Get scope
    await this.getScope(scopeId);

    // Activate scope
    // TODO: Implement scopeModel.activateScope method
    logger.info(`Scope activated: ${scopeId}`);
  }

  /**
   * Deactivate scope (admin only)
   * @param scopeId Scope ID
   */
  async deactivateScope(scopeId: string): Promise<void> {
    // Get scope
    await this.getScope(scopeId);

    // Deactivate scope
    // TODO: Implement scopeModel.deactivateScope method
    logger.info(`Scope deactivated: ${scopeId}`);
  }

  /**
   * Validate scope exists and is active
   * @param scopeName Scope name
   * @returns Scope details
   */
  async validateScope(scopeName: string): Promise<Scope> {
    const scope = await this.getScopeByName(scopeName);
    if (!scope) {
      throw new NotFoundError(`Scope not found: ${scopeName}`);
    }

    if (!scope.is_active) {
      throw new ForbiddenError(`Scope is not active: ${scopeName}`);
    }

    return scope;
  }

  /**
   * Validate multiple scopes
   * @param scopeNames Array of scope names
   * @returns Array of validated scopes
   */
  async validateScopes(scopeNames: string[]): Promise<Scope[]> {
    const scopes: Scope[] = [];

    for (const scopeName of scopeNames) {
      const scope = await this.validateScope(scopeName);
      scopes.push(scope);
    }

    return scopes;
  }

  /**
   * Parse scope string (space-separated)
   * @param scopeString Scope string (e.g., "read write delete")
   * @returns Array of scope names
   */
  parseScopeString(scopeString: string): string[] {
    return scopeString
      .split(' ')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Convert scope array to space-separated string
   * @param scopes Array of scope names
   * @returns Scope string
   */
  formatScopeString(scopes: string[]): string {
    return scopes.join(' ');
  }
}

export const scopeService = new ScopeService();
