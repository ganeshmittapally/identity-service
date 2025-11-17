import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../../src/middleware/validationMiddleware';
import { authMiddleware, adminMiddleware } from '../../src/middleware/authMiddleware';
import { errorHandler, notFoundHandler } from '../../src/middleware/errorHandler';
import { schemas } from '../../src/utils/validators';
import { UnauthorizedError } from '../../src/types';

describe('Validation Middleware', () => {
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
  });

  describe('validate', () => {
    test('should pass validation for valid data', () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const middleware = validate(schemas.register);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    test('should fail validation for invalid email', () => {
      req.body = {
        email: 'invalid-email',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
      };

      const middleware = validate(schemas.register);
      middleware(req as Request, res as Response, next);

      // Should call next with error
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should fail validation for missing required fields', () => {
      req.body = {
        email: 'test@example.com',
        // missing password, first_name, last_name
      };

      const middleware = validate(schemas.register);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should fail validation for short password', () => {
      req.body = {
        email: 'test@example.com',
        password: 'short', // Less than 8 characters
        first_name: 'John',
        last_name: 'Doe',
      };

      const middleware = validate(schemas.register);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();
  });

  describe('authMiddleware', () => {
    test('should throw error for missing authorization header', async () => {
      await authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('should throw error for invalid authorization header format', async () => {
      req.headers = {
        authorization: 'InvalidFormat token123',
      };

      await authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    test('should throw error for missing Bearer token', async () => {
      req.headers = {
        authorization: 'Bearer ',
      };

      await authMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('adminMiddleware', () => {
    test('should throw error if user is not admin', async () => {
      (req as any).userId = 'user-1';
      (req as any).isAdmin = false;

      await adminMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should proceed if user is admin', async () => {
      (req as any).userId = 'user-1';
      (req as any).isAdmin = true;

      await adminMiddleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { path: '/api/test', method: 'POST' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('notFoundHandler', () => {
    test('should return 404 error response', () => {
      notFoundHandler(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'NOT_FOUND',
        }),
      );
    });
  });

  describe('errorHandler', () => {
    test('should handle UnauthorizedError', () => {
      const error = new UnauthorizedError('Invalid credentials');

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'UNAUTHORIZED',
        }),
      );
    });

    test('should handle generic Error', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          code: 'INTERNAL_SERVER_ERROR',
        }),
      );
    });

    test('should handle JSON parsing errors', () => {
      const error = new SyntaxError('Unexpected token');
      (error as any).body = true;

      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INVALID_JSON',
        }),
      );
    });
  });
});
