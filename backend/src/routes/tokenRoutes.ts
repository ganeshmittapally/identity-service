import { Router } from 'express';
import { tokenController } from '../controllers/TokenController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { schemas } from '../utils/validators';
import { wrap } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/v1/oauth/token
 * OAuth 2.0 token endpoint
 * Supports multiple grant types:
 * - authorization_code: Exchange authorization code for access token
 * - refresh_token: Refresh access token using refresh token
 * - client_credentials: Get token for client (without user context)
 * - password: Get token using username/password (resource owner flow)
 *
 * Public endpoint (client authentication via request body)
 */
router.post('/token', validate(schemas.tokenRequest), wrap(tokenController.generateToken.bind(tokenController)));

/**
 * POST /api/v1/oauth/revoke
 * Revoke/invalidate a token
 * Can be called by authenticated users or public (depends on implementation)
 */
router.post('/revoke', validate(schemas.revokeToken), wrap(tokenController.revokeToken.bind(tokenController)));

/**
 * POST /api/v1/oauth/verify
 * Verify token validity and get token payload
 * Public endpoint
 */
router.post('/verify', validate(schemas.verifyToken), wrap(tokenController.verifyToken.bind(tokenController)));

export default router;
