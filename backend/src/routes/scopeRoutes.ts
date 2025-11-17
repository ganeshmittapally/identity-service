import { Router } from 'express';
import { scopeController } from '../controllers/ScopeController';
import { authMiddleware, adminMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { schemas } from '../utils/validators';
import { wrap } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/v1/scopes
 * List all available scopes
 * Public endpoint
 */
router.get('/', wrap(scopeController.listScopes.bind(scopeController)));

/**
 * GET /api/v1/scopes/:scopeId
 * Get specific scope details
 * Public endpoint
 */
router.get('/:scopeId', wrap(scopeController.getScope.bind(scopeController)));

/**
 * POST /api/v1/scopes
 * Create new scope (admin only)
 * Protected endpoint - requires admin role
 */
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  validate(schemas.createScope),
  wrap(scopeController.createScope.bind(scopeController)),
);

/**
 * PUT /api/v1/scopes/:scopeId
 * Update scope (admin only)
 * Protected endpoint - requires admin role
 */
router.put(
  '/:scopeId',
  authMiddleware,
  adminMiddleware,
  validate(schemas.updateScope),
  wrap(scopeController.updateScope.bind(scopeController)),
);

/**
 * DELETE /api/v1/scopes/:scopeId
 * Delete scope (admin only)
 * Protected endpoint - requires admin role
 */
router.delete(
  '/:scopeId',
  authMiddleware,
  adminMiddleware,
  wrap(scopeController.deleteScope.bind(scopeController)),
);

/**
 * POST /api/v1/scopes/:scopeId/activate
 * Activate scope (admin only)
 * Protected endpoint - requires admin role
 */
router.post(
  '/:scopeId/activate',
  authMiddleware,
  adminMiddleware,
  wrap(scopeController.activateScope.bind(scopeController)),
);

/**
 * POST /api/v1/scopes/:scopeId/deactivate
 * Deactivate scope (admin only)
 * Protected endpoint - requires admin role
 */
router.post(
  '/:scopeId/deactivate',
  authMiddleware,
  adminMiddleware,
  wrap(scopeController.deactivateScope.bind(scopeController)),
);

export default router;
