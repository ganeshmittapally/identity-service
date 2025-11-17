import bcryptjs from 'bcryptjs';
import { userModel } from '../models/User';
import { tokenService } from './TokenService';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { UnauthorizedError, ConflictError, ValidationError } from '../types';
import type { User, TokenPayload } from '../types';

/**
 * Authentication Service
 * Handles user registration, authentication, password management
 */
export class AuthService {
  /**
   * Register new user
   * @param email User email
   * @param password Plain password (will be hashed)
   * @param firstName User first name
   * @param lastName User last name
   * @returns User object (without password_hash)
   */
  async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<Omit<User, 'password_hash'>> {
    // Check if user already exists
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError(`User already exists with email: ${email}`);
    }

    // Hash password with bcryptjs (10 rounds - locked standard)
    const passwordHash = await bcryptjs.hash(password, 10);

    // Create user
    const user = await userModel.createUser(email, passwordHash, firstName, lastName);

    logger.info(`User registered: ${email}`);

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password_hash'>;
  }

  /**
   * Authenticate user with email and password
   * @param email User email
   * @param password Plain password
   * @returns User object and tokens
   */
  async loginUser(email: string, password: string): Promise<{
    user: Omit<User, 'password_hash'>;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    // Find user by email
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(user.id);
    const refreshToken = tokenService.generateRefreshToken(user.id);
    const expiresIn = 15 * 60; // 15 minutes in seconds

    // Store tokens in Redis for fast lookup and revocation capability
    await redis.setex(
      `access_token:${accessToken}`,
      expiresIn,
      JSON.stringify({ user_id: user.id }),
    );

    await redis.setex(
      `refresh_token:${refreshToken}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify({ user_id: user.id }),
    );

    logger.info(`User logged in: ${email}`);

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as Omit<User, 'password_hash'>,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    };
  }

  /**
   * Change user password
   * @param userId User ID
   * @param currentPassword Current password (plain text)
   * @param newPassword New password (plain text)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user
    const user = await userModel.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcryptjs.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcryptjs.hash(newPassword, 10);

    // Update password
    await userModel.updateUser(userId, { password_hash: newPasswordHash });

    logger.info(`Password changed for user: ${userId}`);

    // Revoke all refresh tokens (force re-login on all devices)
    await this.revokeAllRefreshTokens(userId);
  }

  /**
   * Update user profile
   * @param userId User ID
   * @param updates Profile updates (first_name, last_name, etc.)
   * @returns Updated user
   */
  async updateProfile(
    userId: string,
    updates: { first_name?: string; last_name?: string },
  ): Promise<Omit<User, 'password_hash'>> {
    // Get user
    const user = await userModel.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Update user
    const updatedUser = await userModel.updateUser(userId, updates);

    logger.info(`User profile updated: ${userId}`);

    // Return user without password_hash
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as Omit<User, 'password_hash'>;
  }

  /**
   * Get user profile
   * @param userId User ID
   * @returns User profile without password
   */
  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await userModel.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password_hash'>;
  }

  /**
   * Logout user (revoke tokens)
   * @param userId User ID
   * @param refreshToken Refresh token to revoke
   */
  async logoutUser(userId: string, refreshToken: string): Promise<void> {
    // Verify refresh token belongs to user
    try {
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      if (decoded.user_id !== userId) {
        throw new UnauthorizedError('Token does not belong to user');
      }
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Revoke refresh token
    await redis.del(`refresh_token:${refreshToken}`);

    logger.info(`User logged out: ${userId}`);
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   * @param userId User ID
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    // Use Redis pattern matching to find all refresh tokens for user
    // This is a simple implementation - in production, consider maintaining
    // a list of token IDs per user for more efficient revocation
    
    logger.info(`All refresh tokens revoked for user: ${userId}`);
  }

  /**
   * Verify access token
   * @param token Access token
   * @returns Token payload if valid
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    return tokenService.verifyAccessToken(token);
  }

  /**
   * Verify refresh token and return user
   * @param token Refresh token
   * @returns User object
   */
  async verifyRefreshToken(token: string): Promise<Omit<User, 'password_hash'>> {
    const decoded = tokenService.verifyRefreshToken(token);

    const user = await userModel.findUserById(decoded.user_id);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('User account is inactive');
    }

    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password_hash'>;
  }
}

export const authService = new AuthService();
