import crypto from 'crypto';
import { oauthClientModel } from '../models/OAuthClient';
import { authorizationCodeModel } from '../models/AuthorizationCode';
import { tokenService } from './TokenService';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { UnauthorizedError, ConflictError, NotFoundError, ForbiddenError } from '../types';
import type { OAuthClient, AccessToken } from '../types';

/**
 * OAuth 2.0 Service
 * Handles OAuth flows, authorization codes, token validation
 */
export class OAuthService {
  // Authorization code expiry in seconds (10 minutes)
  private readonly AUTH_CODE_EXPIRY = 10 * 60;

  // Authorization code length
  private readonly AUTH_CODE_LENGTH = 32;

  /**
   * Generate authorization code
   * @param clientId OAuth client ID
   * @param userId User ID granting access
   * @param redirectUri Redirect URI for the client
   * @param scopes Requested scopes
   * @returns Authorization code
   */
  async generateAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[],
  ): Promise<string> {
    // Validate client and redirect URI
    const client = await this.validateClient(clientId);
    if (!client.redirect_uris.includes(redirectUri)) {
      throw new ForbiddenError('redirect_uri not allowed for this client');
    }

    // Generate authorization code
    const authCode = crypto.randomBytes(this.AUTH_CODE_LENGTH).toString('hex');

    // Store authorization code in Redis (10 minute expiry)
    await redis.setex(
      `auth_code:${authCode}`,
      this.AUTH_CODE_EXPIRY,
      JSON.stringify({
        client_id: clientId,
        user_id: userId,
        redirect_uri: redirectUri,
        scopes,
      }),
    );

    logger.info(`Authorization code generated for client: ${clientId}`);

    return authCode;
  }

  /**
   * Exchange authorization code for access token
   * @param code Authorization code
   * @param clientId OAuth client ID
   * @param clientSecret OAuth client secret
   * @param redirectUri Redirect URI
   * @returns Access token and refresh token
   */
  async exchangeAuthorizationCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> {
    // Validate client credentials
    const client = await this.validateClientCredentials(clientId, clientSecret);

    // Retrieve authorization code from Redis
    const authCodeData = await redis.get(`auth_code:${code}`);
    if (!authCodeData) {
      throw new UnauthorizedError('Invalid or expired authorization code');
    }

    const parsedAuthCode = JSON.parse(authCodeData);

    // Verify client ID and redirect URI match
    if (parsedAuthCode.client_id !== clientId) {
      throw new UnauthorizedError('client_id does not match authorization code');
    }

    if (parsedAuthCode.redirect_uri !== redirectUri) {
      throw new UnauthorizedError('redirect_uri does not match authorization code');
    }

    // Delete authorization code (one-time use)
    await redis.del(`auth_code:${code}`);

    // Generate tokens
    const accessToken = tokenService.generateAccessToken(
      parsedAuthCode.user_id,
      clientId,
      parsedAuthCode.scopes,
    );

    const refreshToken = tokenService.generateRefreshToken(
      parsedAuthCode.user_id,
      clientId,
    );

    const expiresIn = 15 * 60; // 15 minutes

    logger.info(`Authorization code exchanged for tokens - client: ${clientId}`);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  /**
   * Generate tokens using client credentials grant
   * @param clientId OAuth client ID
   * @param clientSecret OAuth client secret
   * @param scopes Requested scopes
   * @returns Access token (no refresh token for client credentials)
   */
  async generateClientCredentialsToken(
    clientId: string,
    clientSecret: string,
    scopes?: string[],
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    // Validate client credentials
    await this.validateClientCredentials(clientId, clientSecret);

    // Generate access token (client credentials flow - no user context)
    const accessToken = tokenService.generateAccessToken(
      clientId, // Use client ID as subject
      clientId,
      scopes || [],
    );

    const expiresIn = 15 * 60; // 15 minutes

    logger.info(`Client credentials token generated - client: ${clientId}`);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken Refresh token
   * @returns New access token
   */
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
  }> {
    // Verify and decode refresh token
    const decoded = tokenService.verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = tokenService.generateAccessToken(
      decoded.user_id,
      decoded.client_id || undefined,
      decoded.scopes || [],
    );

    const expiresIn = 15 * 60; // 15 minutes

    logger.info(`Access token refreshed for user: ${decoded.user_id}`);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }

  /**
   * Revoke token (access or refresh)
   * @param token Token to revoke
   */
  async revokeToken(token: string): Promise<void> {
    // Hash token for Redis key
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Delete token from Redis cache
    await redis.del(`token:${hashedToken}`);
    await redis.del(`refresh_token:${hashedToken}`);

    logger.info('Token revoked');
  }

  /**
   * Validate access token
   * @param token Access token
   * @returns Token payload
   */
  async validateAccessToken(token: string): Promise<any> {
    try {
      return tokenService.verifyAccessToken(token);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  /**
   * Validate OAuth client
   * @param clientId Client ID
   * @returns Client data
   */
  async validateClient(clientId: string): Promise<OAuthClient> {
    const client = await oauthClientModel.findClientByClientId(clientId);
    if (!client) {
      throw new NotFoundError(`Client not found: ${clientId}`);
    }

    if (!client.is_active) {
      throw new ForbiddenError('Client is not active');
    }

    return client;
  }

  /**
   * Validate OAuth client credentials
   * @param clientId Client ID
   * @param clientSecret Client secret
   * @returns Client data if valid
   */
  async validateClientCredentials(clientId: string, clientSecret: string): Promise<OAuthClient> {
    const client = await this.validateClient(clientId);

    // In production, store hashed client secrets in database
    // For now, compare directly (not secure - for demo only)
    if (client.client_secret !== clientSecret) {
      throw new UnauthorizedError('Invalid client credentials');
    }

    return client;
  }

  /**
   * Check if scope is allowed for client
   * @param clientId Client ID
   * @param scope Scope to check
   * @returns True if scope is allowed
   */
  async isScopeAllowedForClient(clientId: string, scope: string): Promise<boolean> {
    const client = await this.validateClient(clientId);
    return (client.allowed_scopes as string[]).includes(scope);
  }

  /**
   * Get allowed scopes for client
   * @param clientId Client ID
   * @returns Array of allowed scopes
   */
  async getAllowedScopesForClient(clientId: string): Promise<string[]> {
    const client = await this.validateClient(clientId);
    return client.allowed_scopes as string[];
  }
}

export const oauthService = new OAuthService();
