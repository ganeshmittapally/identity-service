import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { schemas } from '../utils/validators';
import { wrap } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register new user
 * Public endpoint
 */
router.post('/register', validate(schemas.register), wrap(authController.register.bind(authController)));

/**
 * POST /api/v1/auth/login
 * Authenticate user and get tokens
 * Public endpoint
 */
router.post('/login', validate(schemas.login), wrap(authController.login.bind(authController)));

/**
 * GET /api/v1/auth/profile
 * Get authenticated user profile
 * Protected endpoint
 */
router.get('/profile', authMiddleware, wrap(authController.getProfile.bind(authController)));

/**
 * PUT /api/v1/auth/profile
 * Update authenticated user profile
 * Protected endpoint
 */
router.put(
  '/profile',
  authMiddleware,
  validate(schemas.updateProfile),
  wrap(authController.updateProfile.bind(authController)),
);

/**
 * POST /api/v1/auth/change-password
 * Change user password
 * Protected endpoint
 */
router.post(
  '/change-password',
  authMiddleware,
  validate(schemas.changePassword),
  wrap(authController.changePassword.bind(authController)),
);

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke refresh tokens
 * Protected endpoint
 */
router.post('/logout', authMiddleware, wrap(authController.logout.bind(authController)));

export default router;
