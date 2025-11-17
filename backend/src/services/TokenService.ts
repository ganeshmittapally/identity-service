import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { accessTokenModel } from '../models/AccessToken';
import { refreshTokenModel } from '../models/RefreshToken';
import { getRedisClient, storeToken, getToken, revokeToken } from '../config/redis';

export interface TokenPayload {
  sub: string; // user_id
  client_id: string;
  scope: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export class TokenService {
  generateAccessToken(userId: string, clientId: string, scopes: string[]): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      client_id: clientId,
      scope: scopes.join(' '),
      type: 'access',
    };

    try {
      const token = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn,
        algorithm: 'HS256',
      });

      logger.debug(`Access token generated for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating access token:', error);
      throw error;
    }
  }

  generateRefreshToken(userId: string, clientId: string): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      client_id: clientId,
      scope: '',
      type: 'refresh',
    };

    try {
      const token = jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
        algorithm: 'HS256',
      });

      logger.debug(`Refresh token generated for user: ${userId}`);
      return token;
    } catch (error) {
      logger.error('Error generating refresh token:', error);
      throw error;
    }
  }

  generateAuthorizationCode(userId: string, clientId: string): string {
    const code = crypto.randomBytes(32).toString('hex');
    logger.debug(`Authorization code generated for client: ${clientId}`);
    return code;
  }

  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      if (decoded.type !== 'access') {
        logger.warn('Invalid token type: expected access token');
        return null;
      }

      return decoded;
    } catch (error) {
      logger.debug('Access token verification failed:', error);
      return null;
    }
  }

  verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      if (decoded.type !== 'refresh') {
        logger.warn('Invalid token type: expected refresh token');
        return null;
      }

      return decoded;
    } catch (error) {
      logger.debug('Refresh token verification failed:', error);
      return null;
    }
  }

  async storeAccessTokenHash(
    tokenId: string,
    userId: string,
    clientId: string,
    scopes: string[],
    expirationSeconds: number,
  ): Promise<void> {
    try {
      const tokenData = {
        userId,
        clientId,
        scopes,
        timestamp: new Date().toISOString(),
      };

      await storeToken(`access_token:${tokenId}`, tokenData, expirationSeconds);
      logger.debug(`Access token hash stored: ${tokenId}`);
    } catch (error) {
      logger.error('Error storing access token hash:', error);
      throw error;
    }
  }

  async storeRefreshTokenHash(
    tokenId: string,
    userId: string,
    clientId: string,
    expirationSeconds: number,
  ): Promise<void> {
    try {
      const tokenData = {
        userId,
        clientId,
        timestamp: new Date().toISOString(),
      };

      await storeToken(`refresh_token:${tokenId}`, tokenData, expirationSeconds);
      logger.debug(`Refresh token hash stored: ${tokenId}`);
    } catch (error) {
      logger.error('Error storing refresh token hash:', error);
      throw error;
    }
  }

  async verifyTokenInCache(tokenId: string): Promise<boolean> {
    try {
      const cached = await getToken<Record<string, unknown>>(`access_token:${tokenId}`);
      return cached !== null;
    } catch (error) {
      logger.error('Error verifying token in cache:', error);
      throw error;
    }
  }

  async revokeTokenInCache(tokenId: string): Promise<void> {
    try {
      await revokeToken(tokenId);
      logger.debug(`Token revoked from cache: ${tokenId}`);
    } catch (error) {
      logger.error('Error revoking token from cache:', error);
      throw error;
    }
  }

  hashToken(token: string): string {
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
  }

  extractExpirationSeconds(token: string, isRefresh: boolean = false): number {
    try {
      const decoded = isRefresh
        ? (jwt.verify(token, config.jwt.refreshSecret) as TokenPayload)
        : (jwt.verify(token, config.jwt.secret) as TokenPayload);

      const expirationSeconds = decoded.exp - decoded.iat;
      return expirationSeconds;
    } catch (error) {
      logger.debug('Error extracting token expiration:', error);
      // Default to configured expiration if verification fails
      return isRefresh ? 604800 : 900; // 7 days or 15 minutes
    }
  }
}

export const tokenService = new TokenService();
