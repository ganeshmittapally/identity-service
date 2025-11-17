import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * Security Hardening Middleware
 * CSRF protection, request signing, secret rotation, header validation
 */

/**
 * CSRF Token Generation & Validation
 */
export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly HEADER_NAME = 'x-csrf-token';
  private static readonly COOKIE_NAME = 'csrf-token';

  /**
   * Generate new CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create CSRF token middleware
   */
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Generate CSRF token if not present
      let token = (req.cookies as any)?.[this.COOKIE_NAME];
      if (!token) {
        token = this.generateToken();
        res.cookie(this.COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000, // 1 hour
        });
      }

      // Store token for use in forms
      (req as any).csrfToken = token;

      // For state-changing requests, verify token
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const headerToken = req.headers[this.HEADER_NAME] as string;
        const bodyToken = (req.body as any)?._csrf;
        const providedToken = headerToken || bodyToken;

        if (!providedToken) {
          logger.warn('CSRF token missing', {
            method: req.method,
            path: req.path,
            ip: req.ip,
          });
          return res.status(403).json({
            error: 'CSRF token missing',
            message: 'Cross-site request forgery token is required',
          });
        }

        if (providedToken !== token) {
          logger.warn('CSRF token invalid', {
            method: req.method,
            path: req.path,
            ip: req.ip,
            userId: (req as any).userId,
          });
          return res.status(403).json({
            error: 'CSRF token invalid',
            message: 'Invalid or expired CSRF token',
          });
        }
      }

      next();
    };
  }
}

/**
 * Request Signing & Verification
 * Sign requests with client secret for additional security
 */
export class RequestSigning {
  /**
   * Generate signature for request
   * Signature = HMAC-SHA256(method + path + timestamp + body, clientSecret)
   */
  static generateSignature(method: string, path: string, body: any, clientSecret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const message = `${method}:${path}:${timestamp}:${bodyString}`;

    const signature = crypto
      .createHmac('sha256', clientSecret)
      .update(message)
      .digest('hex');

    return `${signature}:${timestamp}`;
  }

  /**
   * Verify request signature
   */
  static verifySignature(
    method: string,
    path: string,
    body: any,
    clientSecret: string,
    signature: string,
    maxAge: number = 300
  ): boolean {
    try {
      const [signedHash, timestamp] = signature.split(':');
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Check timestamp is recent (prevent replay attacks)
      if (currentTimestamp - parseInt(timestamp) > maxAge) {
        logger.warn('Request signature expired', { timestamp, maxAge });
        return false;
      }

      // Verify signature
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const message = `${method}:${path}:${timestamp}:${bodyString}`;
      const expectedHash = crypto
        .createHmac('sha256', clientSecret)
        .update(message)
        .digest('hex');

      return signedHash === expectedHash;
    } catch (error) {
      logger.error('Signature verification error', { error });
      return false;
    }
  }

  /**
   * Middleware to verify request signatures
   */
  static verifyMiddleware(clientSecretLookup: (clientId: string) => Promise<string | null>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip verification for certain endpoints
      if (req.path === '/health' || req.path === '/api/v1/oauth/token') {
        return next();
      }

      const clientId = (req.headers['x-client-id'] as string) || (req.body as any)?.client_id;
      const signature = req.headers['x-signature'] as string;

      if (!signature || !clientId) {
        return next(); // Continue without verification if not provided
      }

      const clientSecret = await clientSecretLookup(clientId);
      if (!clientSecret) {
        logger.warn('Client secret lookup failed', { clientId });
        return res.status(401).json({ error: 'Invalid client' });
      }

      const isValid = this.verifySignature(req.method, req.path, req.body, clientSecret, signature);
      if (!isValid) {
        logger.warn('Request signature invalid', { clientId, path: req.path });
        return res.status(401).json({
          error: 'Invalid signature',
          message: 'Request signature verification failed',
        });
      }

      next();
    };
  }
}

/**
 * Secret Rotation Management
 */
export class SecretRotation {
  private static readonly ROTATION_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Check if secret needs rotation
   */
  static needsRotation(lastRotatedAt: Date): boolean {
    const now = new Date();
    const timeSinceRotation = now.getTime() - lastRotatedAt.getTime();
    return timeSinceRotation > this.ROTATION_INTERVAL;
  }

  /**
   * Generate new secret
   */
  static generateSecret(prefix: string = 'secret'): string {
    return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Check if user should be prompted to rotate
   */
  static shouldPromptRotation(lastRotatedAt: Date): boolean {
    const now = new Date();
    const daysUntilRotation = Math.floor(
      (this.ROTATION_INTERVAL - (now.getTime() - lastRotatedAt.getTime())) / (24 * 60 * 60 * 1000)
    );
    return daysUntilRotation <= 7; // Prompt 7 days before rotation needed
  }
}

/**
 * Security Header Validation
 * Ensure requests have proper security headers
 */
export function securityHeaderValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only check for requests with bodies
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];

    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded'))) {
      logger.warn('Invalid content-type', {
        path: req.path,
        contentType,
        ip: req.ip,
      });
      return res.status(400).json({
        error: 'Invalid content-type',
        message: 'Content-Type must be application/json or application/x-www-form-urlencoded',
      });
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-original-url',
    'x-rewrite-url',
    'x-original-host',
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header] && !isValidHeader(req.headers[header] as string)) {
      logger.warn('Suspicious header detected', {
        header,
        value: req.headers[header],
        ip: req.ip,
      });
      return res.status(400).json({
        error: 'Suspicious request',
        message: 'Invalid request headers detected',
      });
    }
  }

  // Validate Accept header
  const accept = req.headers['accept'];
  if (accept && !isValidAcceptHeader(accept as string)) {
    logger.warn('Invalid accept header', { accept, ip: req.ip });
    return res.status(400).json({
      error: 'Invalid accept header',
      message: 'Unsupported media type in Accept header',
    });
  }

  next();
}

/**
 * Validate header value
 */
function isValidHeader(value: string): boolean {
  // Prevent header injection attacks
  return !value.includes('\n') && !value.includes('\r') && value.length < 1000;
}

/**
 * Validate Accept header
 */
function isValidAcceptHeader(accept: string): boolean {
  const validTypes = ['application/json', 'application/xml', 'text/plain', '*/*'];
  return validTypes.some((type) => accept.includes(type));
}

/**
 * Input sanitization
 * Prevent XSS and injection attacks
 */
export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }

  next();
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Sanitize string
 */
function sanitizeString(str: string): string {
  // Remove null bytes
  str = str.replace(/\0/g, '');

  // Escape HTML special characters
  const htmlEscapeMap: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return str.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Export all security utilities
 */
export const securityUtils = {
  csrf: CSRFProtection,
  signing: RequestSigning,
  secretRotation: SecretRotation,
  sanitize: inputSanitizationMiddleware,
  validateHeaders: securityHeaderValidationMiddleware,
};

export default securityUtils;
