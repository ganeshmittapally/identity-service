import { Request, Response, NextFunction } from 'express';
import { ObjectSchema } from 'joi';
import { ValidationError } from '../types';
import { logger } from '../config/logger';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against Joi schema
 *
 * Usage:
 * app.post('/api/auth/register', validate(schemas.register), authController.register)
 */
export function validate(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        logger.warn(`Validation failed for ${req.path}:`, validationErrors);

        throw new ValidationError('Validation failed', validationErrors);
      }

      // Replace request body with validated and converted values
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Query parameter validation middleware factory
 * Validates query parameters against Joi schema
 *
 * Usage:
 * app.get('/api/clients', validateQuery(querySchema), clientController.listClients)
 */
export function validateQuery(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        logger.warn(`Query validation failed for ${req.path}:`, validationErrors);

        throw new ValidationError('Query validation failed', validationErrors);
      }

      // Replace request query with validated and converted values
      req.query = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Route parameter validation middleware factory
 * Validates route parameters against Joi schema
 *
 * Usage:
 * app.get('/api/clients/:clientId', validateParams(paramsSchema), clientController.getClient)
 */
export function validateParams(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));

        logger.warn(`Params validation failed for ${req.path}:`, validationErrors);

        throw new ValidationError('Route parameter validation failed', validationErrors);
      }

      // Replace request params with validated and converted values
      req.params = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;
