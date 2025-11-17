import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Request Logging & Audit Trail Middleware
 * Comprehensive logging of all API requests, responses, and security events
 */

export interface AuditLog {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  requestBody?: any;
  responseTime: number;
  eventType: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  details?: any;
}

/**
 * Request logging middleware
 * Logs all incoming requests with response times
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  // Store request id for use in handlers
  (req as any).requestId = requestId;

  // Capture response
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log all requests
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      responseTime: `${duration}ms`,
      ip: req.ip,
      userId: (req as any).userId,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    };

    if (logLevel === 'error') {
      logger.error('Request completed', logData);
    } else if (logLevel === 'warn') {
      logger.warn('Request completed', logData);
    } else {
      logger.info('Request completed', logData);
    }

    return originalSend(body);
  };

  next();
}

/**
 * Security event logging middleware
 * Logs authentication, authorization, and security-related events
 */
export function securityEventLogger(req: Request, res: Response, next: NextFunction) {
  const endpoint = `${req.method} ${req.path}`;

  // Log successful authentication
  if ((req as any).userId && req.path.includes('/auth')) {
    logger.info('Authentication event', {
      requestId: (req as any).requestId,
      type: 'AUTH_SUCCESS',
      userId: (req as any).userId,
      path: req.path,
      ip: req.ip,
    });
  }

  // Log admin actions
  if ((req as any).isAdmin && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
    logger.warn('Admin action', {
      requestId: (req as any).requestId,
      type: 'ADMIN_ACTION',
      action: endpoint,
      adminId: (req as any).userId,
      ip: req.ip,
      timestamp: new Date(),
    });
  }

  // Intercept response to log errors
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    if (res.statusCode === 401) {
      logger.warn('Unauthorized access attempt', {
        requestId: (req as any).requestId,
        path: req.path,
        ip: req.ip,
        email: (req.body as any)?.email,
      });
    } else if (res.statusCode === 403) {
      logger.warn('Forbidden access attempt', {
        requestId: (req as any).requestId,
        path: req.path,
        userId: (req as any).userId,
        ip: req.ip,
      });
    }

    return originalSend(body);
  };

  next();
}

/**
 * Error logging middleware
 * Logs all errors with full context
 */
export function errorLoggerMiddleware(error: any, req: Request, res: Response, next: NextFunction) {
  const errorLog = {
    requestId: (req as any).requestId,
    timestamp: new Date(),
    error: error.message || 'Unknown error',
    errorCode: error.code,
    statusCode: error.statusCode || 500,
    method: req.method,
    path: req.path,
    userId: (req as any).userId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
  };

  if (error.statusCode >= 500) {
    logger.error('Server error', errorLog);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error', errorLog);
  } else {
    logger.error('Application error', errorLog);
  }

  next(error);
}

/**
 * Audit trail logger
 * Logs important business events for compliance
 */
export class AuditTrail {
  /**
   * Log user registration
   */
  static logUserRegistration(userId: string, email: string, ip: string, userAgent: string) {
    logger.info('User registration', {
      eventType: 'USER_REGISTERED',
      severity: 'info',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log successful login
   */
  static logLogin(userId: string, email: string, ip: string, userAgent: string) {
    logger.info('User login', {
      eventType: 'USER_LOGIN',
      severity: 'info',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log failed login attempt
   */
  static logFailedLogin(email: string, ip: string, reason: string) {
    logger.warn('Failed login attempt', {
      eventType: 'LOGIN_FAILED',
      severity: 'warning',
      email,
      ip,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * Log password change
   */
  static logPasswordChange(userId: string, email: string, ip: string) {
    logger.warn('Password changed', {
      eventType: 'PASSWORD_CHANGED',
      severity: 'warning',
      userId,
      email,
      ip,
      timestamp: new Date(),
    });
  }

  /**
   * Log OAuth client registration
   */
  static logClientRegistration(clientId: string, userId: string, clientName: string) {
    logger.info('OAuth client registered', {
      eventType: 'CLIENT_REGISTERED',
      severity: 'info',
      clientId,
      userId,
      clientName,
      timestamp: new Date(),
    });
  }

  /**
   * Log client secret rotation
   */
  static logSecretRotation(clientId: string, userId: string) {
    logger.warn('Client secret rotated', {
      eventType: 'SECRET_ROTATED',
      severity: 'warning',
      clientId,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Log token generation
   */
  static logTokenGeneration(grantType: string, clientId: string, userId?: string, scopes?: string[]) {
    logger.info('Token generated', {
      eventType: 'TOKEN_GENERATED',
      severity: 'info',
      grantType,
      clientId,
      userId,
      scopes,
      timestamp: new Date(),
    });
  }

  /**
   * Log token revocation
   */
  static logTokenRevocation(tokenType: string, userId?: string, clientId?: string) {
    logger.info('Token revoked', {
      eventType: 'TOKEN_REVOKED',
      severity: 'info',
      tokenType,
      userId,
      clientId,
      timestamp: new Date(),
    });
  }

  /**
   * Log suspicious activity
   */
  static logSuspiciousActivity(type: string, description: string, ip: string, userId?: string) {
    logger.warn('Suspicious activity detected', {
      eventType: 'SUSPICIOUS_ACTIVITY',
      severity: 'warning',
      type,
      description,
      ip,
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Log security breach
   */
  static logSecurityBreach(type: string, description: string, severity: 'warning' | 'critical') {
    logger.error('Security event', {
      eventType: 'SECURITY_BREACH',
      severity,
      type,
      description,
      timestamp: new Date(),
    });
  }

  /**
   * Log admin action
   */
  static logAdminAction(action: string, adminId: string, targetId: string, details: any) {
    logger.warn('Admin action', {
      eventType: 'ADMIN_ACTION',
      severity: 'warning',
      action,
      adminId,
      targetId,
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Log scope creation/deletion
   */
  static logScopeChange(action: 'CREATED' | 'UPDATED' | 'DELETED', scopeId: string, scopeName: string, adminId: string) {
    logger.warn(`Scope ${action.toLowerCase()}`, {
      eventType: `SCOPE_${action}`,
      severity: 'warning',
      scopeId,
      scopeName,
      adminId,
      timestamp: new Date(),
    });
  }

  /**
   * Log client deletion
   */
  static logClientDeletion(clientId: string, userId: string, clientName: string) {
    logger.info('OAuth client deleted', {
      eventType: 'CLIENT_DELETED',
      severity: 'info',
      clientId,
      userId,
      clientName,
      timestamp: new Date(),
    });
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  requestLoggerMiddleware,
  securityEventLogger,
  errorLoggerMiddleware,
  AuditTrail,
  generateRequestId,
};
