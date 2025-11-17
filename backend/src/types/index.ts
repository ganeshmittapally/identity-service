// Application Types
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthClient {
  id: string;
  user_id: string;
  client_id: string;
  client_secret: string;
  client_name: string;
  description: string | null;
  redirect_uris: string[];
  allowed_scopes: string[];
  grant_types: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Scope {
  id: string;
  scope_name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface AccessToken {
  id: string;
  user_id: string;
  client_id: string;
  token_hash: string;
  scopes: string[];
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  client_id: string;
  token_hash: string;
  access_token_id: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface AuthorizationCode {
  id: string;
  user_id: string;
  client_id: string;
  code_hash: string;
  redirect_uri: string;
  scopes: string[];
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

// API Request/Response Types
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface JWTPayload {
  sub: string;
  client_id: string;
  scopes: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// Request Types
export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenRequest {
  grant_type: string;
  client_id: string;
  client_secret?: string;
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
  username?: string;
  password?: string;
  scope?: string;
}

export interface ClientRegistrationRequest {
  client_name: string;
  description?: string;
  redirect_uris: string[];
  grant_types: string[];
  scopes?: string[];
}

// Error Types
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}
