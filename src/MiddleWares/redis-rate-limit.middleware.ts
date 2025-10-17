import { Request, Response, NextFunction } from 'express';
import { redisService } from '@utils/redis.service';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests per window
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

/**
 * Redis-based rate limiting middleware
 */
export const redisRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    onLimitReached
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip rate limiting in development mode
      if (process.env.NODE_ENV === 'development' || process.env.DISABLE_RATE_LIMIT === 'true') {
        return next();
      }

      const key = keyGenerator(req);
      const windowInSeconds = Math.ceil(windowMs / 1000);

      // Get current count
      const current = await redisService.get<number>(key, { prefix: 'rate_limit', serialize: false }) || 0;

      if (current >= max) {
        // Rate limit exceeded
        if (onLimitReached) {
          onLimitReached(req, res);
        }

        return res.status(statusCode).json({
          success: false,
          message,
          retryAfter: windowInSeconds
        });
      }

      // Store original end method
      const originalEnd = res.end;

      // Override end method to count requests after response
      res.end = function(...args: any[]) {
        const shouldCount = 
          (!skipSuccessfulRequests || res.statusCode >= 400) &&
          (!skipFailedRequests || res.statusCode < 400);

        if (shouldCount) {
          // Increment counter
          redisService.incr(key, 'rate_limit').then(count => {
            if (count === 1) {
              // Set expiration for the first request in the window
              redisService.expire(key, windowInSeconds, 'rate_limit');
            }
          }).catch(err => {
            console.error('Rate limit increment error:', err);
          });
        }

        // Call original end method
        return (originalEnd as any).apply(this, args);
      };

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': Math.max(0, max - current - 1).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + windowMs).toISOString()
      });

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
};

/**
 * Default key generator based on IP and user ID
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || 'anonymous';
  return `${ip}:${userId}`;
}

/**
 * Rate limit by IP only
 */
export const rateLimitByIP = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return redisRateLimit({
    ...options,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown'
  });
};

/**
 * Rate limit by user ID
 */
export const rateLimitByUser = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return redisRateLimit({
    ...options,
    keyGenerator: (req) => req.user?.id || 'anonymous'
  });
};

/**
 * Rate limit by endpoint
 */
export const rateLimitByEndpoint = (options: Omit<RateLimitOptions, 'keyGenerator'>) => {
  return redisRateLimit({
    ...options,
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const endpoint = `${req.method}:${req.route?.path || req.path}`;
      return `${ip}:${endpoint}`;
    }
  });
};

/**
 * Bypass rate limiting for admin users or development
 */
export const bypassRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for admin users or in development
  const isAdmin = (req as any).user?.role === 'admin';
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isDisabled = process.env.DISABLE_RATE_LIMIT === 'true';
  
  if (isAdmin || isDevelopment || isDisabled) {
    return next();
  }
  
  // Apply normal rate limiting for non-admin users
  return rateLimiters.general(req, res, next);
};

/**
 * Predefined rate limiters for different use cases
 */
export const rateLimiters = {
  // General API rate limiter (more lenient)
  general: redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }),

  // Admin operations (very lenient)
  admin: redisRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 500, // Very high limit for admin operations
    message: 'Too many admin requests, please wait a minute'
  }),

  // Development mode (no limits)
  development: redisRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // Extremely high limit for development
    message: 'Rate limit reached'
  }),

  // Authentication endpoints (stricter)
  auth: redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts, please try again after 15 minutes',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `auth:${ip}`;
    }
  }),

  // Post creation (per user)
  createPost: rateLimitByUser({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many posts created, please wait a minute'
  }),

  // Comment creation (per user)
  createComment: rateLimitByUser({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many comments created, please wait a minute'
  }),

  // Friend requests (per user)
  friendRequest: rateLimitByUser({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many friend requests sent, please wait an hour'
  }),

  // File uploads
  upload: rateLimitByUser({
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: 'Too many file uploads, please wait a minute'
  })
};
