import { Request, Response, NextFunction } from 'express';
import { redisService } from '@utils/redis.service';
import { RedisLogger } from '@utils/redis-logger.service';
import { RedisConnection } from '@db/redis.connection';
import crypto from 'crypto';

interface UniversalCacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
  skipCache?: (req: Request) => boolean; // Function to determine if cache should be skipped
  skipMethods?: string[]; // HTTP methods to skip caching (default: ['POST', 'PUT', 'PATCH', 'DELETE'])
  includeHeaders?: string[]; // Headers to include in cache key generation
  includeQuery?: boolean; // Include query parameters in cache key (default: true)
  includeParams?: boolean; // Include route parameters in cache key (default: true)
  includeUser?: boolean; // Include user ID in cache key (default: false)
  varyBy?: string[]; // Additional fields to vary cache by
}

/**
 * Universal cache middleware that can be applied to any API endpoint
 * Automatically generates cache keys based on request properties
 */
export function universalCache(options: UniversalCacheOptions = {}) {
  const {
    ttl = 600, // 10 minutes default
    prefix = 'api',
    skipCache = () => false,
    skipMethods = ['POST', 'PUT', 'PATCH', 'DELETE'],
    includeHeaders = [],
    includeQuery = true,
    includeParams = true,
    includeUser = false,
    varyBy = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip caching for certain methods
      if (skipMethods.includes(req.method.toUpperCase())) {
        return next();
      }

      // Skip caching if custom condition is met
      if (skipCache(req)) {
        return next();
      }

      // Generate cache key
      const cacheKey = generateCacheKey(req, {
        prefix,
        includeHeaders,
        includeQuery,
        includeParams,
        includeUser,
        varyBy
      });

      // Try to get cached response
      const cachedResponse = await redisService.get(cacheKey);
      if (cachedResponse) {
        // Log cache hit to Redis logs instead of console
        RedisLogger.logCacheHit(cacheKey, cachedResponse);
        return res.json(cachedResponse);
      }

      // Log cache miss to Redis logs instead of console
      RedisLogger.logCacheMiss(cacheKey);

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache the response
      res.json = function(data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the response asynchronously (don't wait)
          redisService.set(cacheKey, data, { ttl }).then(() => {
            // Log cache set operation to Redis logs
            RedisLogger.logCacheSet(cacheKey, ttl);
          }).catch(error => {
            console.error('Cache set error:', error);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Universal cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate a cache key based on request properties
 */
function generateCacheKey(req: Request, options: {
  prefix: string;
  includeHeaders: string[];
  includeQuery: boolean;
  includeParams: boolean;
  includeUser: boolean;
  varyBy: string[];
}): string {
  const keyParts: string[] = [options.prefix];

  // Add route path (normalized)
  const routePath = req.route?.path || req.path;
  keyParts.push(routePath.replace(/[^a-zA-Z0-9]/g, '_'));

  // Add HTTP method
  keyParts.push(req.method.toLowerCase());

  // Add route parameters
  if (options.includeParams && req.params && Object.keys(req.params).length > 0) {
    const paramsString = Object.entries(req.params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    keyParts.push(`params:${paramsString}`);
  }

  // Add query parameters
  if (options.includeQuery && req.query && Object.keys(req.query).length > 0) {
    const queryString = Object.entries(req.query)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    keyParts.push(`query:${queryString}`);
  }

  // Add user ID if authenticated
  if (options.includeUser && (req as any).user?.id) {
    keyParts.push(`user:${(req as any).user.id}`);
  }

  // Add specific headers
  if (options.includeHeaders.length > 0) {
    const headerValues = options.includeHeaders
      .map(header => `${header}:${req.headers[header.toLowerCase()] || ''}`)
      .join('|');
    keyParts.push(`headers:${headerValues}`);
  }

  // Add custom vary by fields
  if (options.varyBy.length > 0) {
    const varyValues = options.varyBy
      .map(field => {
        const value = getNestedValue(req, field);
        return `${field}:${value || ''}`;
      })
      .join('|');
    keyParts.push(`vary:${varyValues}`);
  }

  // Create final cache key
  const fullKey = keyParts.join(':');
  
  // Hash if too long (Redis key limit is 512MB, but shorter is better)
  if (fullKey.length > 200) {
    const hash = crypto.createHash('md5').update(fullKey).digest('hex');
    return `${options.prefix}:hashed:${hash}`;
  }

  return fullKey;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Predefined cache configurations for common use cases
 */
export const cacheConfigs = {
  // Quick cache for frequently accessed, rarely changing data
  static: {
    ttl: 3600, // 1 hour
    skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Medium cache for semi-dynamic data
  dynamic: {
    ttl: 300, // 5 minutes
    skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Short cache for real-time data
  realtime: {
    ttl: 60, // 1 minute
    skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // User-specific cache
  userSpecific: {
    ttl: 600, // 10 minutes
    includeUser: true,
    skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Public data cache (no user context)
  public: {
    ttl: 1800, // 30 minutes
    includeUser: false,
    skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE']
  },

  // Search results cache
  search: {
    ttl: 300, // 5 minutes
    includeQuery: true,
    includeParams: true,
    skipCache: (req: Request) => {
      // Skip cache for empty search queries
      return !req.query.q && !req.query.search && !req.query.term;
    }
  },

  // List/pagination cache
  list: {
    ttl: 600, // 10 minutes
    includeQuery: true,
    skipCache: (req: Request) => {
      // Skip cache if user-specific filters are present
      return !!(req.query.userId || req.query.myPosts || req.query.following);
    }
  }
};

/**
 * Cache invalidation helper
 */
export class CacheInvalidator {
  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      // Use Redis SCAN to find keys matching pattern, then delete them
      const redis = RedisConnection.getInstance();
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      const deletedCount = await redis.del(...keys);
      
      // Log cache invalidation to Redis logs
      RedisLogger.logCacheClear(pattern, deletedCount);
      
      return deletedCount;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache for specific entity
   */
  static async invalidateEntity(entityType: string, entityId?: string): Promise<number> {
    const patterns = [
      `api:*${entityType}*`,
      entityId ? `api:*${entityType}*${entityId}*` : null
    ].filter(Boolean);

    let totalInvalidated = 0;
    for (const pattern of patterns) {
      totalInvalidated += await this.invalidatePattern(pattern!);
    }
    return totalInvalidated;
  }

  /**
   * Invalidate user-specific cache
   */
  static async invalidateUser(userId: string): Promise<number> {
    return await this.invalidatePattern(`api:*user:${userId}*`);
  }

  /**
   * Invalidate cache by route
   */
  static async invalidateRoute(routePath: string): Promise<number> {
    const normalizedPath = routePath.replace(/[^a-zA-Z0-9]/g, '_');
    return await this.invalidatePattern(`api:${normalizedPath}*`);
  }
}

/**
 * Middleware to invalidate cache after successful mutations
 */
export function invalidateCache(patterns: string[] | ((req: Request) => string[])) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to invalidate cache after successful response
    res.json = function(data: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const invalidationPatterns = typeof patterns === 'function' ? patterns(req) : patterns;
        
        // Invalidate cache asynchronously
        Promise.all(
          invalidationPatterns.map(pattern => CacheInvalidator.invalidatePattern(pattern))
        ).catch(error => {
          console.error('Cache invalidation error:', error);
        });
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Quick cache middleware factory for common patterns
 */
export const quickCache = {
  // Cache for 1 hour (static data)
  static: () => universalCache(cacheConfigs.static),
  
  // Cache for 5 minutes (dynamic data)
  dynamic: () => universalCache(cacheConfigs.dynamic),
  
  // Cache for 1 minute (real-time data)
  realtime: () => universalCache(cacheConfigs.realtime),
  
  // User-specific cache
  userSpecific: () => universalCache(cacheConfigs.userSpecific),
  
  // Public data cache
  public: () => universalCache(cacheConfigs.public),
  
  // Search results cache
  search: () => universalCache(cacheConfigs.search),
  
  // List/pagination cache
  list: () => universalCache(cacheConfigs.list),
  
  // Custom cache with specific TTL
  custom: (ttl: number, options: Partial<UniversalCacheOptions> = {}) => 
    universalCache({ ttl, ...options })
};

export default universalCache;
