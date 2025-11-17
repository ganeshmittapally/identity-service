import Joi from 'joi';

/**
 * Request validation schemas using Joi
 * Used by validationMiddleware to validate incoming requests
 */

// Auth schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'any.required': 'Password is required',
  }),
  first_name: Joi.string().max(100).required().messages({
    'string.max': 'First name cannot exceed 100 characters',
    'any.required': 'First name is required',
  }),
  last_name: Joi.string().max(100).required().messages({
    'string.max': 'Last name cannot exceed 100 characters',
    'any.required': 'Last name is required',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  new_password: Joi.string().min(8).required().messages({
    'string.min': 'New password must be at least 8 characters',
    'any.required': 'New password is required',
  }),
  confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Password confirmation is required',
  }),
});

export const updateProfileSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100),
}).min(1);

// OAuth token schemas
export const tokenRequestSchema = Joi.object({
  grant_type: Joi.string()
    .valid('authorization_code', 'refresh_token', 'client_credentials', 'password')
    .required()
    .messages({
      'string.valid': 'Invalid grant_type',
      'any.required': 'grant_type is required',
    }),

  // For authorization_code flow
  code: Joi.when('grant_type', {
    is: 'authorization_code',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'any.required': 'code is required for authorization_code flow',
  }),
  redirect_uri: Joi.when('grant_type', {
    is: 'authorization_code',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().optional(),
  }).messages({
    'string.uri': 'redirect_uri must be a valid URI',
    'any.required': 'redirect_uri is required for authorization_code flow',
  }),
  client_id: Joi.string().required().messages({
    'any.required': 'client_id is required',
  }),
  client_secret: Joi.string().required().messages({
    'any.required': 'client_secret is required',
  }),

  // For refresh_token flow
  refresh_token: Joi.when('grant_type', {
    is: 'refresh_token',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'any.required': 'refresh_token is required for refresh_token flow',
  }),

  // For client_credentials flow
  scope: Joi.string().optional(),

  // For password flow
  username: Joi.when('grant_type', {
    is: 'password',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'any.required': 'username is required for password flow',
  }),
  password: Joi.when('grant_type', {
    is: 'password',
    then: Joi.string().required(),
    otherwise: Joi.string().optional(),
  }).messages({
    'any.required': 'password is required for password flow',
  }),
});

export const revokeTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'token is required',
  }),
});

export const verifyTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'token is required',
  }),
});

// Client registration schemas
export const registerClientSchema = Joi.object({
  client_name: Joi.string().min(3).max(255).required().messages({
    'string.min': 'Client name must be at least 3 characters',
    'string.max': 'Client name cannot exceed 255 characters',
    'any.required': 'Client name is required',
  }),
  redirect_uris: Joi.array()
    .items(Joi.string().uri())
    .required()
    .messages({
      'array.base': 'redirect_uris must be an array',
      'string.uri': 'Each redirect URI must be valid',
      'any.required': 'At least one redirect_uri is required',
    }),
  description: Joi.string().max(500).optional(),
  allowed_scopes: Joi.array()
    .items(Joi.string())
    .required()
    .messages({
      'array.base': 'allowed_scopes must be an array',
      'any.required': 'At least one allowed scope is required',
    }),
});

export const updateClientSchema = Joi.object({
  client_name: Joi.string().min(3).max(255).optional(),
  redirect_uris: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'string.uri': 'Each redirect URI must be valid',
    }),
  description: Joi.string().max(500).optional(),
  allowed_scopes: Joi.array()
    .items(Joi.string())
    .optional(),
}).min(1);

// Scope schemas
export const createScopeSchema = Joi.object({
  scope_name: Joi.string().min(3).max(100).required().messages({
    'string.min': 'Scope name must be at least 3 characters',
    'string.max': 'Scope name cannot exceed 100 characters',
    'any.required': 'Scope name is required',
  }),
  description: Joi.string().max(500).optional(),
});

export const updateScopeSchema = Joi.object({
  scope_name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
}).min(1);

/**
 * Schema definitions object for easy importing and reuse
 */
export const schemas = {
  // Auth
  register: registerSchema,
  login: loginSchema,
  changePassword: changePasswordSchema,
  updateProfile: updateProfileSchema,

  // OAuth Token
  tokenRequest: tokenRequestSchema,
  revokeToken: revokeTokenSchema,
  verifyToken: verifyTokenSchema,

  // Client
  registerClient: registerClientSchema,
  updateClient: updateClientSchema,

  // Scope
  createScope: createScopeSchema,
  updateScope: updateScopeSchema,
};

export default schemas;
