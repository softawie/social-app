# Redis Integration Guide

## 🚀 Overview

This guide covers the comprehensive Redis integration for your social app with best practices for caching, session management, and rate limiting.

## 📦 Installation

```bash
npm install redis ioredis @types/redis
```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Cache Configuration
CACHE_TTL=3600
CACHE_ENABLED=true

# Session Configuration
SESSION_TTL=86400
MAX_SESSIONS_PER_USER=5
```

## 🏗️ Architecture

### 1. Redis Connection (`src/db/redis.connection.ts`)
- Singleton pattern for connection management
- Automatic reconnection with retry logic
- Health check capabilities
- Graceful error handling

### 2. Redis Service (`src/utils/redis.service.ts`)
- Comprehensive caching utilities
- Support for different data types (strings, lists, sets)
- Automatic serialization/deserialization
- Cache-with-fallback pattern

### 3. Cache Middleware (`src/MiddleWares/cache.middleware.ts`)
- Automatic response caching for GET requests
- Configurable TTL and cache keys
- Cache invalidation patterns
- Conditional caching

### 4. Rate Limiting (`src/MiddleWares/redis-rate-limit.middleware.ts`)
- Redis-based distributed rate limiting
- Multiple rate limiting strategies
- Configurable windows and limits
- Rate limit headers

### 5. Session Management (`src/utils/session.service.ts`)
- Redis-based session storage
- Multi-device session support
- Session analytics and management
- Automatic cleanup

## 🎯 Usage Examples

### Basic Caching

```typescript
import { redisService } from '@utils/redis.service';

// Cache data
await redisService.set('user:123', userData, { ttl: 1800 });

// Get cached data
const user = await redisService.get('user:123');

// Cache with fallback
const posts = await redisService.cacheWithFallback(
  'posts:recent',
  async () => await PostModel.find().limit(10),
  { ttl: 600 }
);
```

### Route Caching

```typescript
import { cacheMiddleware } from '@src/MiddleWares/cache.middleware';

// Cache GET requests for 10 minutes
router.get('/posts', 
  cacheMiddleware({ ttl: 600, prefix: 'posts' }),
  PostController.getPosts
);
```

### Rate Limiting

```typescript
import { rateLimiters } from '@src/MiddleWares/redis-rate-limit.middleware';

// Apply rate limiting to post creation
router.post('/posts',
  authenticationMiddleware,
  rateLimiters.createPost, // 5 posts per minute per user
  PostController.createPost
);
```

### Session Management

```typescript
import { SessionService } from '@utils/session.service';

// Create session
const sessionId = await SessionService.createSession(userId, {
  email: user.email,
  role: user.role,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});

// Get active sessions
const sessions = await SessionService.getUserSessions(userId);

// Destroy all other sessions
await SessionService.destroyOtherSessions(userId, currentSessionId);
```

## 🔄 Cache Invalidation Strategies

### 1. Pattern-Based Invalidation
```typescript
// Invalidate all post-related caches
await redisService.delPattern('cache:posts:*');

// Invalidate specific entity
await redisService.invalidateEntity('post', postId);
```

### 2. Automatic Invalidation
```typescript
import { invalidateCacheMiddleware, cacheInvalidationPatterns } from '@src/MiddleWares/cache.middleware';

router.put('/posts/:id',
  authenticationMiddleware,
  invalidateCacheMiddleware((req) => cacheInvalidationPatterns.post(req.params.id)),
  PostController.updatePost
);
```

## 📊 Monitoring and Health Checks

### Health Check Endpoint
```bash
GET /health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 5
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    },
    "memory": {
      "used": 52428800,
      "total": 134217728,
      "percentage": 39
    }
  }
}
```

## 🎛️ Cache Strategies by Feature

### Posts
- **List caching**: 10 minutes TTL
- **Individual posts**: 30 minutes TTL
- **Invalidation**: On create/update/delete

### Comments
- **Comment lists**: 5 minutes TTL
- **Individual comments**: 15 minutes TTL
- **Invalidation**: On create/update/delete

### User Data
- **User profiles**: 30 minutes TTL
- **Friend lists**: 15 minutes TTL
- **Invalidation**: On profile updates

### Friend Requests
- **Request lists**: 5 minutes TTL
- **Invalidation**: On status changes

## 🚦 Rate Limiting Configuration

```typescript
export const rateLimiters = {
  // General API (100 requests per 15 minutes)
  general: redisRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  }),

  // Authentication (5 attempts per 15 minutes)
  auth: redisRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5
  }),

  // Post creation (5 posts per minute per user)
  createPost: rateLimitByUser({
    windowMs: 60 * 1000,
    max: 5
  }),

  // Comment creation (10 comments per minute per user)
  createComment: rateLimitByUser({
    windowMs: 60 * 1000,
    max: 10
  }),

  // Friend requests (20 requests per hour per user)
  friendRequest: rateLimitByUser({
    windowMs: 60 * 60 * 1000,
    max: 20
  })
};
```

## 🔧 Integration Steps

### 1. Update Routes
Replace your existing routes with cached versions:

```typescript
// Before
router.get('/posts', optionalAuth, PostController.getPosts);

// After
router.get('/posts', 
  optionalAuth, 
  postsCacheMiddleware, 
  PostController.getPosts
);
```

### 2. Add Rate Limiting
```typescript
router.post('/posts',
  authenticationMiddleware,
  rateLimiters.createPost,
  invalidateCacheMiddleware(['cache:posts:*']),
  PostController.createPost
);
```

### 3. Update Authentication
Integrate session management with your auth middleware:

```typescript
// In your auth service
const sessionId = await SessionService.createSession(user._id, {
  email: user.email,
  role: user.role,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

## 🛠️ Best Practices

### 1. Cache Keys
- Use consistent naming: `entity:id` or `entity:list:params`
- Include version numbers for breaking changes
- Use prefixes to group related data

### 2. TTL Strategy
- Short TTL for frequently changing data (5-15 minutes)
- Medium TTL for semi-static data (30 minutes - 1 hour)
- Long TTL for static data (hours to days)

### 3. Error Handling
- Never let cache failures break your app
- Always have fallback to database
- Log cache errors for monitoring

### 4. Memory Management
- Set appropriate TTLs to prevent memory bloat
- Use Redis memory policies (allkeys-lru recommended)
- Monitor memory usage regularly

## 🚀 Performance Benefits

### Expected Improvements
- **Response Time**: 50-90% reduction for cached endpoints
- **Database Load**: 60-80% reduction in read queries
- **Scalability**: Better handling of concurrent requests
- **User Experience**: Faster page loads and API responses

### Monitoring Metrics
- Cache hit/miss ratios
- Response times before/after caching
- Redis memory usage
- Rate limit violations

## 🔍 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server status
   - Verify connection credentials
   - Check network connectivity

2. **High Memory Usage**
   - Review TTL settings
   - Check for memory leaks
   - Consider Redis memory policies

3. **Cache Invalidation Issues**
   - Verify invalidation patterns
   - Check cache key consistency
   - Monitor invalidation logs

### Debug Commands
```bash
# Check Redis connection
redis-cli ping

# Monitor Redis commands
redis-cli monitor

# Check memory usage
redis-cli info memory

# List all keys
redis-cli keys "*"
```

## 📈 Next Steps

1. **Install Dependencies**: `npm install redis ioredis @types/redis`
2. **Configure Environment**: Update your `.env` file
3. **Start Redis Server**: `redis-server` or use Docker
4. **Update Routes**: Integrate caching middleware
5. **Monitor Performance**: Use health check endpoints
6. **Optimize**: Adjust TTLs based on usage patterns

This Redis integration provides a solid foundation for scaling your social app with improved performance and better resource utilization.
