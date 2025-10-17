import { Request, Response, NextFunction } from 'express';
import { redisService } from '@utils/redis.service';
import crypto from 'crypto';

export interface CacheMiddlewareOptions {
  ttl?: number;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean;
  skipCache?: (req: Request) => boolean;
}

/**
 * Cache middleware for GET requests
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests by default
    if (req.method !== 'GET') {
      return next();
    }

    const {
      ttl = 300, // 5 minutes default
      prefix = 'cache',
      keyGenerator,
      condition,
      skipCache
    } = options;

    try {
      // Check if we should skip caching
      if (skipCache && skipCache(req)) {
        return next();
      }

      // Check condition if provided
      if (condition && !condition(req)) {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : generateCacheKey(req);

      // Try to get from cache
      const cachedData = await redisService.get(cacheKey, { prefix });

      if (cachedData) {
        console.log(`Cache HIT: ${prefix}:${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`Cache MISS: ${prefix}:${cacheKey}`);

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(data: any) {
        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisService.set(cacheKey, data, { prefix, ttl }).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }

        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
};

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const { method, originalUrl, query, user } = req;
  const userId = user?.id || 'anonymous';
  
  // Create a hash of the request details
  const keyData = {
    method,
    url: originalUrl,
    query,
    userId
  };

  return crypto
    .createHash('md5')
    .update(JSON.stringify(keyData))
    .digest('hex');
}

/**
 * Cache invalidation middleware
 */
export const invalidateCacheMiddleware = (patterns: string[] | ((req: Request) => string[])) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to invalidate cache after successful response
    res.json = function(data: any) {
      // Invalidate cache for successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const invalidationPatterns = typeof patterns === 'function' 
          ? patterns(req) 
          : patterns;

        invalidationPatterns.forEach(pattern => {
          redisService.delPattern(pattern).catch(err => {
            console.error('Failed to invalidate cache pattern:', pattern, err);
          });
        });
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Specific cache middleware for posts
 */
export const postsCacheMiddleware = cacheMiddleware({
  ttl: 600, // 10 minutes
  prefix: 'posts',
  keyGenerator: (req) => {
    const { page = 1, limit = 10, userId, tag, visibility, search, sortBy, sortOrder } = req.query;
    return `list:${page}:${limit}:${userId || ''}:${tag || ''}:${visibility || ''}:${search || ''}:${sortBy || ''}:${sortOrder || ''}`;
  },
  condition: (req) => {
    // Only cache if no user-specific filters
    return !req.query.userId;
  }
});

/**
 * Specific cache middleware for comments
 */
export const commentsCacheMiddleware = cacheMiddleware({
  ttl: 300, // 5 minutes
  prefix: 'comments',
  keyGenerator: (req) => {
    const { postId, parentCommentId, page = 1, limit = 10 } = req.query;
    return `list:${postId || ''}:${parentCommentId || ''}:${page}:${limit}`;
  }
});

/**
 * Specific cache middleware for user data
 */
export const userCacheMiddleware = cacheMiddleware({
  ttl: 1800, // 30 minutes
  prefix: 'users',
  keyGenerator: (req) => {
    return `profile:${req.params.id || req.user?.id}`;
  }
});

/**
 * Cache invalidation patterns for different entities
 */
export const cacheInvalidationPatterns = {
  post: (postId: string) => [
    `cache:posts:*`,
    `cache:posts:single:${postId}`,
    `cache:comments:list:${postId}:*`
  ],
  
  comment: (postId: string, commentId: string) => [
    `cache:comments:*`,
    `cache:comments:single:${commentId}`,
    `cache:comments:list:${postId}:*`,
    `cache:posts:single:${postId}` // Invalidate post cache as comment count changes
  ],
  
  user: (userId: string) => [
    `cache:users:profile:${userId}`,
    `cache:posts:*`, // User posts might be cached
    `cache:friend-requests:*`
  ],
  
  friendRequest: (userId: string) => [
    `cache:friend-requests:*`,
    `cache:users:profile:${userId}`
  ]
};
