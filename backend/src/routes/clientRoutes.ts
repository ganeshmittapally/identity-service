import { Router } from 'express';
import { clientController } from '../controllers/ClientController';
import { authMiddleware } from '../middleware/authMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { schemas } from '../utils/validators';
import { wrap } from '../middleware/errorHandler';

const router = Router();

/**
 * All client endpoints require authentication
 */
router.use(authMiddleware);

/**
 * POST /api/v1/clients
 * Register new OAuth client
 * Protected endpoint
 */
router.post(
  '/',
  validate(schemas.registerClient),
  wrap(clientController.registerClient.bind(clientController)),
);

/**
 * GET /api/v1/clients
 * List user's OAuth clients (paginated)
 * Protected endpoint
 */
router.get('/', wrap(clientController.listClients.bind(clientController)));

/**
 * GET /api/v1/clients/:clientId
 * Get specific client details
 * Protected endpoint
 */
router.get('/:clientId', wrap(clientController.getClient.bind(clientController)));

/**
 * PUT /api/v1/clients/:clientId
 * Update OAuth client
 * Protected endpoint
 */
router.put(
  '/:clientId',
  validate(schemas.updateClient),
  wrap(clientController.updateClient.bind(clientController)),
);

/**
 * DELETE /api/v1/clients/:clientId
 * Delete OAuth client
 * Protected endpoint
 */
router.delete('/:clientId', wrap(clientController.deleteClient.bind(clientController)));

/**
 * POST /api/v1/clients/:clientId/activate
 * Activate OAuth client
 * Protected endpoint
 */
router.post('/:clientId/activate', wrap(clientController.activateClient.bind(clientController)));

/**
 * POST /api/v1/clients/:clientId/deactivate
 * Deactivate OAuth client
 * Protected endpoint
 */
router.post('/:clientId/deactivate', wrap(clientController.deactivateClient.bind(clientController)));

export default router;
