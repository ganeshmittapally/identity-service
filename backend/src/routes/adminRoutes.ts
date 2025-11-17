import { Router } from 'express';
import { adminController } from '../controllers/AdminController';
import { authenticate, authorizeAdmin } from '../middleware/authMiddleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorizeAdmin);

// User management
router.get('/users', adminController.getUsers.bind(adminController));
router.post('/users/:userId/suspend', adminController.suspendUser.bind(adminController));
router.post('/users/:userId/unsuspend', adminController.unsuspendUser.bind(adminController));
router.post('/users/:userId/reset-login-attempts', adminController.resetLoginAttempts.bind(adminController));

// Client management
router.get('/clients', adminController.getClients.bind(adminController));
router.post('/clients/:clientId/revoke', adminController.revokeClient.bind(adminController));
router.post('/clients/:clientId/reset-secret', adminController.resetClientSecret.bind(adminController));

// System configuration
router.get('/config', adminController.getConfig.bind(adminController));
router.patch('/config', adminController.updateConfig.bind(adminController));

// Dashboard and analytics
router.get('/dashboard', adminController.getDashboard.bind(adminController));
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));

export default router;
