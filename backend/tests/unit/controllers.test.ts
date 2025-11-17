import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authController } from '../../src/controllers/AuthController';
import { clientController } from '../../src/controllers/ClientController';
import { scopeController } from '../../src/controllers/ScopeController';
import { authService } from '../../src/services/AuthService';
import { clientService } from '../../src/services/ClientService';
import { scopeService } from '../../src/services/ScopeService';

jest.mock('../../src/services/AuthService');
jest.mock('../../src/services/ClientService');
jest.mock('../../src/services/ScopeService');

describe('AuthController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('should register user and return 201', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'John',
      };

      (authService.registerUser as jest.Mock).mockResolvedValue(mockUser);

      await authController.register(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('login', () => {
    test('should login user and return tokens', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockLoginResult = {
        user: { id: 'user-1', email: 'test@example.com' },
        access_token: 'token123',
        refresh_token: 'refresh123',
        expires_in: 900,
      };

      (authService.loginUser as jest.Mock).mockResolvedValue(mockLoginResult);

      await authController.login(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getProfile', () => {
    test('should return user profile', async () => {
      (req as any).userId = 'user-1';

      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'John',
      };

      (authService.getProfile as jest.Mock).mockResolvedValue(mockUser);

      await authController.getProfile(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateProfile', () => {
    test('should update user profile', async () => {
      (req as any).userId = 'user-1';
      req.body = {
        first_name: 'Jane',
        last_name: 'Smith',
      };

      const mockUpdatedUser = {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      };

      (authService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await authController.updateProfile(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('changePassword', () => {
    test('should change user password', async () => {
      (req as any).userId = 'user-1';
      req.body = {
        current_password: 'oldpass',
        new_password: 'newpass123',
        confirm_password: 'newpass123',
      };

      (authService.changePassword as jest.Mock).mockResolvedValue(undefined);

      await authController.changePassword(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    test('should logout user', async () => {
      (req as any).userId = 'user-1';
      req.body = { refresh_token: 'refresh123' };

      (authService.logoutUser as jest.Mock).mockResolvedValue(undefined);

      await authController.logout(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});

describe('ClientController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('registerClient', () => {
    test('should register new client', async () => {
      (req as any).userId = 'user-1';
      req.body = {
        client_name: 'My App',
        redirect_uris: ['https://example.com/callback'],
        allowed_scopes: ['read', 'write'],
      };

      const mockClient = {
        id: 'client-1',
        client_name: 'My App',
        client_secret: 'secret123',
      };

      (clientService.registerClient as jest.Mock).mockResolvedValue(mockClient);

      await clientController.registerClient(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listClients', () => {
    test('should list user clients', async () => {
      (req as any).userId = 'user-1';
      req.query = { limit: '50', offset: '0' };

      const mockClients = [
        { id: 'client-1', client_name: 'App 1' },
        { id: 'client-2', client_name: 'App 2' },
      ];

      (clientService.listClientsForUser as jest.Mock).mockResolvedValue(mockClients);

      await clientController.listClients(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getClient', () => {
    test('should return client details', async () => {
      (req as any).userId = 'user-1';
      req.params = { clientId: 'client-1' };

      const mockClient = {
        id: 'client-1',
        client_name: 'My App',
        user_id: 'user-1',
      };

      (clientService.getClient as jest.Mock).mockResolvedValue(mockClient);

      await clientController.getClient(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteClient', () => {
    test('should delete client', async () => {
      (req as any).userId = 'user-1';
      req.params = { clientId: 'client-1' };

      (clientService.deleteClient as jest.Mock).mockResolvedValue(undefined);

      await clientController.deleteClient(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});

describe('ScopeController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('listScopes', () => {
    test('should list all scopes', async () => {
      req.query = { limit: '100', offset: '0' };

      const mockScopes = [
        { id: 'scope-1', scope_name: 'read' },
        { id: 'scope-2', scope_name: 'write' },
      ];

      (scopeService.getAllScopes as jest.Mock).mockResolvedValue(mockScopes);

      await scopeController.listScopes(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getScope', () => {
    test('should return scope details', async () => {
      req.params = { scopeId: 'scope-1' };

      const mockScope = {
        id: 'scope-1',
        scope_name: 'read',
      };

      (scopeService.getScope as jest.Mock).mockResolvedValue(mockScope);

      await scopeController.getScope(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('createScope', () => {
    test('should create new scope (admin only)', async () => {
      (req as any).isAdmin = true;
      req.body = {
        scope_name: 'admin',
        description: 'Admin access',
      };

      const mockScope = {
        id: 'scope-1',
        scope_name: 'admin',
      };

      (scopeService.createScope as jest.Mock).mockResolvedValue(mockScope);

      await scopeController.createScope(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteScope', () => {
    test('should delete scope (admin only)', async () => {
      (req as any).isAdmin = true;
      req.params = { scopeId: 'scope-1' };

      (scopeService.deleteScope as jest.Mock).mockResolvedValue(undefined);

      await scopeController.deleteScope(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
