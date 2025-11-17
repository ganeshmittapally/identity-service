import { Request, Response, NextFunction } from 'express';
import { tokenService, TokenPayload } from '../services/TokenService';
import { accessTokenModel } from '../models/AccessToken';
import { refreshTokenModel } from '../models/RefreshToken';
import { oauthClientModel } from '../models/OAuthClient';
import { logger } from '../config/logger';
import { UnauthorizedError, ForbiddenError } from '../types';
import { storeToken, getToken, deleteCache } from '../config/redis';

export class TokenController {
  /**
   * Generate new access and refresh tokens
   * POST /api/v1/oauth/token
   */
  async generateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { grant_type, username, password, client_id, client_secret, code, redirect_uri, refresh_token } = req.body;

      if (!grant_type) {
        throw new UnauthorizedError('grant_type is required');
      }

      let accessToken: string;
      let newRefreshToken: string | undefined;
      let expiresIn: number;

      switch (grant_type) {
        case 'password':
          // Resource owner password credentials grant
          ({ accessToken, newRefreshToken, expiresIn } = await this.handlePasswordGrant(
            username,
            password,
            client_id,
            client_secret,
          ));
          break;

        case 'authorization_code':
          // Authorization code grant
          ({ accessToken, newRefreshToken, expiresIn } = await this.handleAuthorizationCodeGrant(
            code,
            redirect_uri,
            client_id,
            client_secret,
          ));
          break;

        case 'refresh_token':
          // Refresh token grant
          ({ accessToken, newRefreshToken, expiresIn } = await this.handleRefreshTokenGrant(
            refresh_token,
            client_id,
            client_secret,
          ));
          break;

        case 'client_credentials':
          // Client credentials grant
          ({ accessToken, expiresIn } = await this.handleClientCredentialsGrant(client_id, client_secret));
          break;

        default:
          throw new UnauthorizedError(`Unsupported grant_type: ${grant_type}`);
      }

      const response: any = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
      };

      if (newRefreshToken) {
        response.refresh_token = newRefreshToken;
      }

      logger.info(`Token generated for grant_type: ${grant_type}`);

      res.status(200).json({
        status: 'success',
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a token (access or refresh)
   * POST /api/v1/oauth/revoke
   */
  async revokeToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, token_type_hint } = req.body;

      if (!token) {
        throw new UnauthorizedError('token is required');
      }

      const tokenHash = tokenService.hashToken(token);

      // Try to revoke from database
      const isAccessToken = token_type_hint !== 'refresh_token';

      if (isAccessToken) {
        await accessTokenModel.cleanupExpiredTokens();
      } else {
        await refreshTokenModel.cleanupExpiredTokens();
      }

      // Also try to delete from cache
      await deleteCache(`access_token:${tokenHash}`);
      await deleteCache(`refresh_token:${tokenHash}`);

      logger.info(`Token revoked: ${tokenHash.substring(0, 10)}...`);

      res.status(200).json({
        status: 'success',
        message: 'Token revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify token validity
   * POST /api/v1/oauth/verify
   */
  async verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new UnauthorizedError('token is required');
      }

      const payload = tokenService.verifyAccessToken(token);

      if (!payload) {
        throw new UnauthorizedError('Invalid or expired token');
      }

      res.status(200).json({
        status: 'success',
        data: {
          valid: true,
          payload: {
            sub: payload.sub,
            client_id: payload.client_id,
            scope: payload.scope,
            exp: payload.exp,
            iat: payload.iat,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Private helper methods

  private async handlePasswordGrant(
    username: string,
    password: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; newRefreshToken: string; expiresIn: number }> {
    // TODO: Implement password grant
    throw new UnauthorizedError('Password grant not yet implemented');
  }

  private async handleAuthorizationCodeGrant(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; newRefreshToken: string; expiresIn: number }> {
    // TODO: Implement authorization code grant
    throw new UnauthorizedError('Authorization code grant not yet implemented');
  }

  private async handleRefreshTokenGrant(
    refreshTokenValue: string,
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; newRefreshToken: string; expiresIn: number }> {
    if (!refreshTokenValue) {
      throw new UnauthorizedError('refresh_token is required');
    }

    // Verify refresh token
    const payload = tokenService.verifyRefreshToken(refreshTokenValue);
    if (!payload) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Verify client
    const client = await oauthClientModel.findClientById(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new ForbiddenError('Invalid client credentials');
    }

    // Generate new access token
    const accessToken = tokenService.generateAccessToken(payload.sub, clientId, payload.scope.split(' '));
    const newRefreshToken = tokenService.generateRefreshToken(payload.sub, clientId);

    return {
      accessToken,
      newRefreshToken,
      expiresIn: 900,
    };
  }

  private async handleClientCredentialsGrant(
    clientId: string,
    clientSecret: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    // Verify client
    const client = await oauthClientModel.findClientById(clientId);
    if (!client || client.clientSecret !== clientSecret) {
      throw new ForbiddenError('Invalid client credentials');
    }

    // Generate access token
    const accessToken = tokenService.generateAccessToken(clientId, clientId, client.allowedScopes);

    return {
      accessToken,
      expiresIn: 900,
    };
  }
}

export const tokenController = new TokenController();
