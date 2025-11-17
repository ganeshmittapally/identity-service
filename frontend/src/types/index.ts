// User types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'inactive';
  createdAt: string;
  updatedAt: string;
  twoFactorEnabled: boolean;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    userId: string;
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface TwoFactorSetupResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

// OAuth Client types
export interface OAuthClient {
  clientId: string;
  clientName: string;
  clientType: 'public' | 'confidential';
  clientSecret?: string;
  status: 'active' | 'inactive' | 'revoked';
  redirectUris: string[];
  allowedScopes: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
  tokenCount: number;
  lastUsed?: string;
}

export interface CreateClientRequest {
  clientName: string;
  clientType: 'public' | 'confidential';
  redirectUris: string[];
  allowedScopes: string[];
}

export interface UpdateClientRequest {
  clientName?: string;
  redirectUris?: string[];
  allowedScopes?: string[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Token types
export interface Token {
  id: string;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  createdAt: string;
  revokedAt?: string;
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalClients: number;
  activeClients: number;
  totalTokens: number;
  activeTokens: number;
  systemHealth: 'healthy' | 'degraded' | 'critical';
  uptime: number;
}

export interface AuditLog {
  id: string;
  action: string;
  admin: string;
  targetUser?: string;
  targetClient?: string;
  changes: Record<string, unknown>;
  timestamp: string;
  ipAddress: string;
}
