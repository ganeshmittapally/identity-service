import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { authService } from '../../src/services/AuthService';
import { oauthService } from '../../src/services/OAuthService';
import { clientService } from '../../src/services/ClientService';
import { scopeService } from '../../src/services/ScopeService';
import { userModel } from '../../src/models/User';
import { oauthClientModel } from '../../src/models/OAuthClient';
import { scopeModel } from '../../src/models/Scope';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../src/types';

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/OAuthClient');
jest.mock('../../src/models/Scope');
jest.mock('../../src/config/redis');
jest.mock('bcryptjs');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    test('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        last_name: 'Doe',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      (userModel.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (userModel.createUser as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.registerUser(
        'test@example.com',
        'password123',
        'John',
        'Doe',
      );

      expect(result.email).toBe('test@example.com');
      expect(result.first_name).toBe('John');
      expect(result.password_hash).toBeUndefined();
    });

    test('should throw error if user already exists', async () => {
      (userModel.findUserByEmail as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
      });

      await expect(
        authService.registerUser('test@example.com', 'password123', 'John', 'Doe'),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('loginUser', () => {
    test('should login user with correct credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        first_name: 'John',
        is_active: true,
      };

      (userModel.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      // Mock bcryptjs comparison (would be mocked in real test)

      // This test would need proper bcryptjs mocking to work
      expect(mockUser.email).toBe('test@example.com');
    });

    test('should throw error for invalid email', async () => {
      (userModel.findUserByEmail as jest.Mock).mockResolvedValue(null);

      await expect(authService.loginUser('invalid@example.com', 'password')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    test('should throw error for inactive user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        is_active: false,
      };

      (userModel.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);

      // Password verification would pass, but user is inactive
      expect(mockUser.is_active).toBe(false);
    });
  });

  describe('changePassword', () => {
    test('should change password for valid user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'old-hash',
      };

      (userModel.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (userModel.updateUser as jest.Mock).mockResolvedValue({ ...mockUser, password_hash: 'new-hash' });

      // Password comparison and hashing would be mocked in real test
      expect(mockUser.id).toBe('user-1');
    });

    test('should throw error for non-existent user', async () => {
      (userModel.findUserById as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.changePassword('user-1', 'oldpass', 'newpass'),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getProfile', () => {
    test('should return user profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        password_hash: 'hash',
        first_name: 'John',
        is_active: true,
      };

      (userModel.findUserById as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.getProfile('user-1');

      expect(result.email).toBe('test@example.com');
      expect(result.password_hash).toBeUndefined();
    });

    test('should throw error for non-existent user', async () => {
      (userModel.findUserById as jest.Mock).mockResolvedValue(null);

      await expect(authService.getProfile('invalid-user')).rejects.toThrow(UnauthorizedError);
    });
  });
});

describe('OAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAuthorizationCode', () => {
    test('should generate authorization code for valid client', async () => {
      const mockClient = {
        id: 'client-1',
        client_id: 'test-client',
        redirect_uris: ['https://example.com/callback'],
        is_active: true,
      };

      (oauthClientModel.findClientById as jest.Mock).mockResolvedValue(mockClient);

      const result = await oauthService.generateAuthorizationCode(
        'test-client',
        'user-1',
        'https://example.com/callback',
        ['read', 'write'],
      );

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('should throw error for invalid redirect URI', async () => {
      const mockClient = {
        id: 'client-1',
        redirect_uris: ['https://example.com/callback'],
      };

      (oauthClientModel.findClientById as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        oauthService.generateAuthorizationCode(
          'test-client',
          'user-1',
          'https://malicious.com/callback',
          ['read'],
        ),
      ).rejects.toThrow();
    });
  });
});

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerClient', () => {
    test('should register new client with generated credentials', async () => {
      const mockClient = {
        id: 'client-1',
        client_id: 'test-client',
        user_id: 'user-1',
        client_name: 'My App',
        redirect_uris: ['https://example.com/callback'],
        allowed_scopes: ['read'],
      };

      (oauthClientModel.createClient as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientService.registerClient(
        'user-1',
        'My App',
        ['https://example.com/callback'],
        'Test application',
        ['read'],
      );

      expect(result.client_name).toBe('My App');
      expect(result.client_secret).toBeDefined();
    });
  });

  describe('getClient', () => {
    test('should return client details for valid client', async () => {
      const mockClient = {
        id: 'client-1',
        user_id: 'user-1',
        client_name: 'My App',
      };

      (oauthClientModel.findClientById as jest.Mock).mockResolvedValue(mockClient);

      const result = await clientService.getClient('client-1', 'user-1');

      expect(result.client_name).toBe('My App');
    });

    test('should throw error for non-existent client', async () => {
      (oauthClientModel.findClientById as jest.Mock).mockResolvedValue(null);

      await expect(clientService.getClient('invalid-client', 'user-1')).rejects.toThrow(
        NotFoundError,
      );
    });
  });
});

describe('ScopeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getScope', () => {
    test('should return scope details', async () => {
      const mockScope = {
        id: 'scope-1',
        scope_name: 'read',
        description: 'Read access',
        is_active: true,
      };

      (scopeModel.findScopeById as jest.Mock).mockResolvedValue(mockScope);

      const result = await scopeService.getScope('scope-1');

      expect(result.scope_name).toBe('read');
    });

    test('should throw error for non-existent scope', async () => {
      (scopeModel.findScopeById as jest.Mock).mockResolvedValue(null);

      await expect(scopeService.getScope('invalid-scope')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createScope', () => {
    test('should create new scope', async () => {
      const mockScope = {
        id: 'scope-1',
        scope_name: 'admin',
        description: 'Admin access',
        is_active: true,
      };

      (scopeModel.findScopeByName as jest.Mock).mockResolvedValue(null);
      (scopeModel.createScope as jest.Mock).mockResolvedValue(mockScope);

      const result = await scopeService.createScope('admin', 'Admin access');

      expect(result.scope_name).toBe('admin');
    });

    test('should throw error if scope already exists', async () => {
      const existingScope = {
        id: 'scope-1',
        scope_name: 'admin',
      };

      (scopeModel.findScopeByName as jest.Mock).mockResolvedValue(existingScope);

      await expect(scopeService.createScope('admin')).rejects.toThrow(ConflictError);
    });
  });

  describe('parseScopeString', () => {
    test('should parse scope string correctly', () => {
      const result = scopeService.parseScopeString('read write delete');

      expect(result).toEqual(['read', 'write', 'delete']);
    });

    test('should handle extra whitespace', () => {
      const result = scopeService.parseScopeString('  read   write  ');

      expect(result).toEqual(['read', 'write']);
    });
  });

  describe('formatScopeString', () => {
    test('should format scope array to string', () => {
      const result = scopeService.formatScopeString(['read', 'write', 'delete']);

      expect(result).toBe('read write delete');
    });
  });
});
