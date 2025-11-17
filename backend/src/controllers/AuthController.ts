import { Request, Response, NextFunction } from 'express';
import bcryptjs from 'bcryptjs';
import { userModel } from '../models/User';
import { tokenService } from '../services/TokenService';
import { logger } from '../config/logger';
import { AppError, ConflictError, UnauthorizedError, ValidationError } from '../types';
import { getRedisClient, storeToken } from '../config/redis';

export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await userModel.findUserByEmail(email);
      if (existingUser) {
        throw new ConflictError(`User with email ${email} already exists`);
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 10);

      // Create user
      const user = await userModel.createUser(email, passwordHash, firstName, lastName);

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
          },
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user and return access token
   * POST /api/v1/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

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
      const passwordMatch = await bcryptjs.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const accessToken = tokenService.generateAccessToken(user.id, 'direct', ['profile', 'email']);
      const refreshToken = tokenService.generateRefreshToken(user.id, 'direct');

      // Store tokens in Redis
      const accessTokenHash = tokenService.hashToken(accessToken);
      const refreshTokenHash = tokenService.hashToken(refreshToken);
      const accessExpirationSeconds = tokenService.extractExpirationSeconds(accessToken, false);
      const refreshExpirationSeconds = tokenService.extractExpirationSeconds(refreshToken, true);

      await storeToken(`access_token:${user.id}:direct`, accessTokenHash, accessExpirationSeconds);
      await storeToken(`refresh_token:${user.id}:direct`, refreshTokenHash, refreshExpirationSeconds);

      logger.info(`User logged in: ${email}`);

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 900,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/profile
   * Requires: Bearer token in Authorization header
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId; // Set by auth middleware

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const user = await userModel.findUserById(userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_active: user.is_active,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   * Requires: Bearer token in Authorization header
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { firstName, lastName, password } = req.body;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      const updates: any = {};

      if (firstName) {
        updates.first_name = firstName;
      }

      if (lastName) {
        updates.last_name = lastName;
      }

      if (password) {
        updates.password_hash = await bcryptjs.hash(password, 10);
      }

      const updatedUser = await userModel.updateUser(userId, updates);

      logger.info(`User profile updated: ${userId}`);

      res.status(200).json({
        status: 'success',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            first_name: updatedUser.first_name,
            last_name: updatedUser.last_name,
            is_active: updatedUser.is_active,
          },
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout user (revoke refresh token)
   * POST /api/v1/auth/logout
   * Requires: Bearer token in Authorization header
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      // Revoke refresh tokens in Redis
      const redis = getRedisClient();
      await redis.del(`refresh_token:${userId}:direct`);

      logger.info(`User logged out: ${userId}`);

      res.status(200).json({
        status: 'success',
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   * POST /api/v1/auth/change-password
   * Requires: Bearer token in Authorization header
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        throw new UnauthorizedError('User ID not found in request');
      }

      // Get user
      const user = await userModel.findUserById(userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Verify current password
      const passwordMatch = await bcryptjs.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Hash and update new password
      const newPasswordHash = await bcryptjs.hash(newPassword, 10);
      await userModel.updateUser(userId, { password_hash: newPasswordHash });

      logger.info(`Password changed for user: ${userId}`);

      res.status(200).json({
        status: 'success',
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
