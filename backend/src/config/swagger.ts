/**
 * Swagger/OpenAPI Configuration
 * Complete API documentation for all 23 endpoints
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Identity Service API',
    version: '1.0.0',
    description:
      'OAuth 2.0 Identity Provider Service - Complete authentication and authorization server',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development Server',
    },
    {
      url: 'https://api.example.com/api/v1',
      description: 'Production Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization token',
      },
    },
    schemas: {
      // User/Profile Schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          is_active: { type: 'boolean' },
          is_admin: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          first_name: { type: 'string' },
          last_name: { type: 'string' },
          is_active: { type: 'boolean' },
        },
      },

      // Token Schemas
      TokenResponse: {
        type: 'object',
        properties: {
          access_token: { type: 'string', description: 'JWT access token' },
          refresh_token: { type: 'string', description: 'Refresh token for getting new access tokens' },
          token_type: { type: 'string', enum: ['Bearer'] },
          expires_in: { type: 'number', description: 'Token expiration in seconds' },
        },
        required: ['access_token', 'token_type', 'expires_in'],
      },
      AuthTokenResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          access_token: { type: 'string' },
          refresh_token: { type: 'string' },
          token_type: { type: 'string', enum: ['Bearer'] },
          expires_in: { type: 'number' },
        },
      },

      // OAuth Client Schemas
      OAuthClient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          client_id: { type: 'string' },
          client_secret: { type: 'string' },
          client_name: { type: 'string' },
          description: { type: 'string' },
          redirect_uris: { type: 'array', items: { type: 'string', format: 'uri' } },
          allowed_scopes: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      OAuthClientCreateRequest: {
        type: 'object',
        properties: {
          client_name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          redirect_uris: {
            type: 'array',
            items: { type: 'string', format: 'uri' },
            minItems: 1,
          },
          allowed_scopes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['client_name', 'redirect_uris'],
      },

      // Scope Schemas
      Scope: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          scope_name: { type: 'string' },
          description: { type: 'string' },
          is_active: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      ScopeCreateRequest: {
        type: 'object',
        properties: {
          scope_name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
        },
        required: ['scope_name'],
      },

      // Error Schemas
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: { type: 'string', const: 'Validation Error' },
          message: { type: 'string' },
          fields: {
            type: 'object',
            additionalProperties: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      RateLimitError: {
        type: 'object',
        properties: {
          error: { type: 'string', const: 'Too many requests' },
          message: { type: 'string' },
          retryAfter: { type: 'number' },
        },
      },
    },
  },
  paths: {
    // AUTH ENDPOINTS
    '/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create a new user account with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                },
                required: ['email', 'password', 'first_name', 'last_name'],
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthTokenResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid input or user already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationError' },
              },
            },
          },
          '429': {
            description: 'Too many registration attempts',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateLimitError' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user',
        description: 'Authenticate user with email and password to get tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthTokenResponse' },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '429': {
            description: 'Too many login attempts',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RateLimitError' },
              },
            },
          },
        },
      },
    },
    '/auth/profile': {
      get: {
        tags: ['Authentication'],
        summary: 'Get user profile',
        description: 'Retrieve authenticated user profile information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Authentication'],
        summary: 'Update user profile',
        description: 'Update authenticated user profile information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change user password',
        description: 'Change password for authenticated user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  current_password: { type: 'string' },
                  new_password: { type: 'string', minLength: 8 },
                },
                required: ['current_password', 'new_password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed successfully',
          },
          '401': {
            description: 'Invalid current password',
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout user',
        description: 'Invalidate current tokens and logout',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logged out successfully',
          },
          '401': {
            description: 'Unauthorized',
          },
        },
      },
    },

    // OAUTH TOKEN ENDPOINTS
    '/oauth/token': {
      post: {
        tags: ['OAuth Token'],
        summary: 'OAuth Token Endpoint',
        description:
          'Generate tokens using Authorization Code, Client Credentials, Refresh Token, or Password grant',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  grant_type: {
                    type: 'string',
                    enum: ['authorization_code', 'client_credentials', 'refresh_token', 'password'],
                  },
                  code: { type: 'string', description: 'For authorization_code grant' },
                  redirect_uri: { type: 'string', description: 'For authorization_code grant' },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                  refresh_token: { type: 'string', description: 'For refresh_token grant' },
                  username: { type: 'string', description: 'For password grant' },
                  password: { type: 'string', description: 'For password grant' },
                  scope: { type: 'string' },
                },
                required: ['grant_type', 'client_id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token generated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TokenResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid grant or client',
          },
          '401': {
            description: 'Invalid client credentials',
          },
        },
      },
    },
    '/oauth/revoke': {
      post: {
        tags: ['OAuth Token'],
        summary: 'Revoke Token',
        description: 'Revoke an access or refresh token',
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  client_id: { type: 'string' },
                  client_secret: { type: 'string' },
                },
                required: ['token', 'client_id'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token revoked successfully',
          },
        },
      },
    },

    // CLIENT ENDPOINTS
    '/clients': {
      post: {
        tags: ['OAuth Clients'],
        summary: 'Register OAuth Client',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthClientCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Client created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthClient' },
              },
            },
          },
        },
      },
      get: {
        tags: ['OAuth Clients'],
        summary: 'List OAuth Clients',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'number' } },
          { name: 'limit', in: 'query', schema: { type: 'number' } },
        ],
        responses: {
          '200': {
            description: 'Clients retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/OAuthClient' } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        total: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/clients/{clientId}': {
      get: {
        tags: ['OAuth Clients'],
        summary: 'Get OAuth Client',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Client retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthClient' },
              },
            },
          },
          '404': {
            description: 'Client not found',
          },
        },
      },
      put: {
        tags: ['OAuth Clients'],
        summary: 'Update OAuth Client',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/OAuthClientCreateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Client updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthClient' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['OAuth Clients'],
        summary: 'Delete OAuth Client',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': {
            description: 'Client deleted successfully',
          },
        },
      },
    },
    '/clients/{clientId}/activate': {
      post: {
        tags: ['OAuth Clients'],
        summary: 'Activate OAuth Client',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Client activated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthClient' },
              },
            },
          },
        },
      },
    },
    '/clients/{clientId}/deactivate': {
      post: {
        tags: ['OAuth Clients'],
        summary: 'Deactivate OAuth Client',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'clientId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Client deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/OAuthClient' },
              },
            },
          },
        },
      },
    },

    // SCOPE ENDPOINTS
    '/scopes': {
      get: {
        tags: ['Scopes'],
        summary: 'List Scopes',
        description: 'Get list of all available scopes (public endpoint)',
        responses: {
          '200': {
            description: 'Scopes retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Scope' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Scopes'],
        summary: 'Create Scope',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScopeCreateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Scope created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Scope' },
              },
            },
          },
        },
      },
    },
    '/scopes/{scopeId}': {
      get: {
        tags: ['Scopes'],
        summary: 'Get Scope',
        parameters: [{ name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Scope retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Scope' },
              },
            },
          },
          '404': {
            description: 'Scope not found',
          },
        },
      },
      put: {
        tags: ['Scopes'],
        summary: 'Update Scope',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScopeCreateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Scope updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Scope' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Scopes'],
        summary: 'Delete Scope',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': {
            description: 'Scope deleted successfully',
          },
        },
      },
    },
    '/scopes/{scopeId}/activate': {
      post: {
        tags: ['Scopes'],
        summary: 'Activate Scope',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Scope activated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Scope' },
              },
            },
          },
        },
      },
    },
    '/scopes/{scopeId}/deactivate': {
      post: {
        tags: ['Scopes'],
        summary: 'Deactivate Scope',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'scopeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Scope deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Scope' },
              },
            },
          },
        },
      },
    },
  },
};

export default swaggerDefinition;
