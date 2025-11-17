import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * API Versioning Service
 * Manages API versioning with v1/v2 compatibility
 */

export interface VersionedEndpoint {
  path: string;
  method: string;
  versions: string[];
  deprecatedAt?: string;
  deprecationNotice?: string;
}

export interface VersionCompatibility {
  currentVersion: string;
  supportedVersions: string[];
  deprecatedVersions: string[];
  sunsetVersions: string[];
}

/**
 * API Versioning Manager
 */
export class ApiVersionService {
  private currentVersion = 'v2';
  private supportedVersions = ['v1', 'v2'];
  private deprecatedVersions: string[] = [];
  private sunsetVersions: string[] = [];
  private endpoints: Map<string, VersionedEndpoint> = new Map();

  /**
   * Get version from request
   */
  static getVersion(req: Request): string {
    // Check Accept header first (preferred)
    const acceptHeader = req.get('Accept');
    if (acceptHeader?.includes('application/vnd.identity+json')) {
      const match = acceptHeader.match(/version=(\d+)/);
      if (match) return `v${match[1]}`;
    }

    // Check X-API-Version header
    const versionHeader = req.get('X-API-Version');
    if (versionHeader) return versionHeader;

    // Check URL path (e.g., /api/v2/...)
    const pathMatch = req.path.match(/\/api\/(v\d+)\//);
    if (pathMatch) return pathMatch[1];

    // Default to v1 for backward compatibility
    return 'v1';
  }

  /**
   * Register versioned endpoint
   */
  registerEndpoint(
    path: string,
    method: string,
    versions: string[],
    deprecatedAt?: string,
    deprecationNotice?: string
  ): void {
    const key = `${method.toUpperCase()} ${path}`;
    this.endpoints.set(key, {
      path,
      method,
      versions,
      deprecatedAt,
      deprecationNotice,
    });
  }

  /**
   * Get endpoint compatibility
   */
  getEndpointCompatibility(path: string, method: string): VersionedEndpoint | null {
    const key = `${method.toUpperCase()} ${path}`;
    return this.endpoints.get(key) || null;
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    return this.deprecatedVersions.includes(version);
  }

  /**
   * Check if version is sunset (no longer supported)
   */
  isVersionSunset(version: string): boolean {
    return this.sunsetVersions.includes(version);
  }

  /**
   * Get compatibility info
   */
  getCompatibility(): VersionCompatibility {
    return {
      currentVersion: this.currentVersion,
      supportedVersions: this.supportedVersions,
      deprecatedVersions: this.deprecatedVersions,
      sunsetVersions: this.sunsetVersions,
    };
  }

  /**
   * Mark version as deprecated
   */
  deprecateVersion(version: string, sunsetDate: Date): void {
    if (!this.deprecatedVersions.includes(version)) {
      this.deprecatedVersions.push(version);
      logger.warn('API version deprecated', { version, sunsetDate });
    }
  }

  /**
   * Mark version as sunset
   */
  sunsetVersion(version: string): void {
    if (!this.sunsetVersions.includes(version)) {
      this.sunsetVersions.push(version);
      const index = this.supportedVersions.indexOf(version);
      if (index > -1) {
        this.supportedVersions.splice(index, 1);
      }
      logger.info('API version sunset', { version });
    }
  }
}

/**
 * Version adapter for converting requests between API versions
 */
export class VersionAdapter {
  /**
   * Adapt request from v1 to v2
   */
  static adaptV1ToV2(req: Request): void {
    // V2 uses /api/v2 prefix
    req.url = req.url.replace('/api/v1/', '/api/v2/');

    // Field name mappings
    const fieldMappings: Record<string, string> = {
      client_id: 'clientId',
      client_secret: 'clientSecret',
      redirect_uri: 'redirectUri',
      response_type: 'responseType',
      grant_type: 'grantType',
      refresh_token: 'refreshToken',
      access_token: 'accessToken',
      token_type: 'tokenType',
      expires_in: 'expiresIn',
      created_at: 'createdAt',
      updated_at: 'updatedAt',
    };

    // Adapt request body
    if (req.body && typeof req.body === 'object') {
      Object.keys(fieldMappings).forEach(oldKey => {
        if (oldKey in req.body) {
          const newKey = fieldMappings[oldKey];
          req.body[newKey] = req.body[oldKey];
          delete req.body[oldKey];
        }
      });
    }

    // Adapt query parameters
    if (req.query && typeof req.query === 'object') {
      Object.keys(fieldMappings).forEach(oldKey => {
        if (oldKey in req.query) {
          const newKey = fieldMappings[oldKey];
          req.query[newKey] = req.query[oldKey];
          delete req.query[oldKey];
        }
      });
    }
  }

  /**
   * Adapt response from v2 to v1
   */
  static adaptV2ToV1(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const fieldMappings: Record<string, string> = {
      clientId: 'client_id',
      clientSecret: 'client_secret',
      redirectUri: 'redirect_uri',
      responseType: 'response_type',
      grantType: 'grant_type',
      refreshToken: 'refresh_token',
      accessToken: 'access_token',
      tokenType: 'token_type',
      expiresIn: 'expires_in',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.adaptV2ToV1(item));
    }

    // Handle objects
    const adapted: any = {};
    Object.keys(data).forEach(key => {
      const newKey = fieldMappings[key] || key;
      const value = data[key];
      adapted[newKey] = typeof value === 'object' ? this.adaptV2ToV1(value) : value;
    });

    return adapted;
  }
}

/**
 * Version middleware factory
 */
export class VersionMiddleware {
  private versionService: ApiVersionService;

  constructor(versionService: ApiVersionService) {
    this.versionService = versionService;
  }

  /**
   * Extract and validate version
   */
  extractVersion() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const version = ApiVersionService.getVersion(req);

      // Check if version is sunset
      if (this.versionService.isVersionSunset(version)) {
        res.status(410).json({
          error: 'API version no longer supported',
          version,
          currentVersion: this.versionService.getCompatibility().currentVersion,
          message: `${version} is no longer supported. Please upgrade to ${this.versionService.getCompatibility().currentVersion}`,
        });
        logger.warn('Sunset API version used', { version, path: req.path });
        return;
      }

      // Add version to request
      (req as any).apiVersion = version;

      // Add deprecation warning if needed
      if (this.versionService.isVersionDeprecated(version)) {
        res.setHeader('Deprecation', 'true');
        res.setHeader(
          'Sunset',
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
        );
        res.setHeader(
          'Warning',
          `299 - "${version} is deprecated, use ${this.versionService.getCompatibility().currentVersion}"`
        );

        logger.info('Deprecated API version used', { version, path: req.path });
      }

      next();
    };
  }

  /**
   * Auto-adapt from v1 to v2
   */
  autoAdapt() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const version = (req as any).apiVersion || 'v1';

      if (version === 'v1') {
        VersionAdapter.adaptV1ToV2(req);
      }

      next();
    };
  }

  /**
   * Wrap response adapter
   */
  wrapResponseAdapter(version: string = 'v1') {
    return (req: Request, res: Response, next: NextFunction): void => {
      const apiVersion = (req as any).apiVersion || version;
      const originalJson = res.json;

      // Override json method to adapt response
      res.json = function(data: any) {
        if (apiVersion === 'v1' && data) {
          data = VersionAdapter.adaptV2ToV1(data);
        }
        return originalJson.call(this, data);
      };

      next();
    };
  }
}

// Export singleton instances
export const apiVersionService = new ApiVersionService();
export const versionMiddleware = new VersionMiddleware(apiVersionService);

export default apiVersionService;
