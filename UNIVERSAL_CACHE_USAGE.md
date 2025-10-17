# Universal Cache Middleware Usage Guide

## 🚀 Overview

The Universal Cache Middleware provides a single, flexible caching solution that can be applied to any API endpoint without creating specific middleware for each route.

## 📦 Quick Start

### Basic Usage

```typescript
import { quickCache, universalCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

// Apply to any route with default settings (10 minutes cache)
router.get('/posts', universalCache(), PostController.getPosts);

// Or use predefined configurations
router.get('/posts', quickCache.dynamic(), PostController.getPosts);
```

### Predefined Cache Types

```typescript
// Static data (1 hour cache)
router.get('/categories', quickCache.static(), CategoryController.getAll);

// Dynamic data (5 minutes cache)
router.get('/posts', quickCache.dynamic(), PostController.getPosts);

// Real-time data (1 minute cache)
router.get('/notifications', quickCache.realtime(), NotificationController.getUnread);

// User-specific data (includes user ID in cache key)
router.get('/dashboard', authMiddleware, quickCache.userSpecific(), DashboardController.get);

// Public data (no user context)
router.get('/public/posts', quickCache.public(), PostController.getPublic);

// Search results
router.get('/search', quickCache.search(), SearchController.search);

// Lists with pagination
router.get('/posts', quickCache.list(), PostController.getPosts);
```

## 🔧 Custom Configuration

### Advanced Options

```typescript
router.get('/posts', universalCache({
  ttl: 300, // 5 minutes
  prefix: 'posts',
  includeUser: true, // Include user ID in cache key
  includeQuery: true, // Include query params in cache key
  includeParams: true, // Include route params in cache key
  includeHeaders: ['accept-language'], // Include specific headers
  varyBy: ['user.role'], // Vary cache by custom fields
  skipCache: (req) => {
    // Skip cache for admin users
    return req.user?.role === 'admin';
  },
  skipMethods: ['POST', 'PUT', 'PATCH', 'DELETE'] // Methods to skip
}), PostController.getPosts);
```

### Conditional Caching

```typescript
// Skip cache based on request conditions
router.get('/posts', universalCache({
  ttl: 600,
  skipCache: (req) => {
    // Don't cache if user is requesting their own posts
    return req.query.userId === req.user?.id;
  }
}), PostController.getPosts);
```

## 🗂️ Complete API Integration

### Posts API

```typescript
// src/modules/post/post.routes.ts
import { Router } from 'express';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';
import { authenticationMiddleware, optionalAuth } from '@src/MiddleWares/auth.middleware';
import { PostController } from './post.controller';

const router = Router();

// GET routes with caching
router.get('/', 
  optionalAuth, 
  quickCache.list(), // Cache lists for 10 minutes
  PostController.getPosts
);

router.get('/:id', 
  optionalAuth, 
  quickCache.dynamic(), // Cache individual posts for 5 minutes
  PostController.getPost
);

router.get('/:id/comments', 
  optionalAuth, 
  quickCache.dynamic(), // Cache comments for 5 minutes
  PostController.getComments
);

// POST/PUT/DELETE routes with cache invalidation
router.post('/', 
  authenticationMiddleware,
  invalidateCache(['api:*posts*', 'api:*dashboard*']), // Invalidate related caches
  PostController.createPost
);

router.put('/:id', 
  authenticationMiddleware,
  invalidateCache((req) => [
    `api:*posts*${req.params.id}*`, // Invalidate this specific post
    'api:*posts*list*', // Invalidate post lists
    `api:*user:${req.user.id}*` // Invalidate user-specific caches
  ]),
  PostController.updatePost
);

router.delete('/:id', 
  authenticationMiddleware,
  invalidateCache(['api:*posts*', 'api:*dashboard*']),
  PostController.deletePost
);

export default router;
```

### Comments API

```typescript
// src/modules/comment/comment.routes.ts
import { Router } from 'express';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// GET routes
router.get('/', quickCache.dynamic(), CommentController.getComments);
router.get('/:id', quickCache.dynamic(), CommentController.getComment);

// Mutation routes with invalidation
router.post('/', 
  authenticationMiddleware,
  invalidateCache((req) => [
    `api:*posts*${req.body.postId}*`, // Invalidate parent post cache
    'api:*comments*', // Invalidate comment caches
    `api:*user:${req.user.id}*` // Invalidate user caches
  ]),
  CommentController.createComment
);

router.put('/:id', 
  authenticationMiddleware,
  invalidateCache(['api:*comments*', 'api:*posts*']),
  CommentController.updateComment
);

export default router;
```

### User API

```typescript
// src/modules/users/user.routes.ts
import { Router } from 'express';
import { quickCache, invalidateCache, universalCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// Public user data (longer cache)
router.get('/:id/profile', quickCache.public(), UserController.getProfile);

// User-specific data
router.get('/me', 
  authenticationMiddleware, 
  quickCache.userSpecific(), 
  UserController.getMe
);

router.get('/me/posts', 
  authenticationMiddleware, 
  universalCache({
    ttl: 300,
    includeUser: true,
    includeQuery: true
  }), 
  UserController.getMyPosts
);

// Search users (shorter cache)
router.get('/search', quickCache.search(), UserController.searchUsers);

// Mutations with cache invalidation
router.put('/me', 
  authenticationMiddleware,
  invalidateCache((req) => [
    `api:*user:${req.user.id}*`, // Invalidate all user-specific caches
    `api:*users*${req.user.id}*` // Invalidate user profile caches
  ]),
  UserController.updateProfile
);

export default router;
```

### Friend Requests API

```typescript
// src/modules/friend-request/friend-request.routes.ts
import { Router } from 'express';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// User-specific friend requests
router.get('/', 
  authenticationMiddleware, 
  quickCache.userSpecific(), 
  FriendRequestController.getRequests
);

router.get('/sent', 
  authenticationMiddleware, 
  quickCache.userSpecific(), 
  FriendRequestController.getSentRequests
);

// Mutations
router.post('/', 
  authenticationMiddleware,
  invalidateCache((req) => [
    `api:*user:${req.user.id}*`, // Sender's caches
    `api:*user:${req.body.recipientId}*`, // Recipient's caches
    'api:*friend*' // All friend-related caches
  ]),
  FriendRequestController.sendRequest
);

router.put('/:id/accept', 
  authenticationMiddleware,
  invalidateCache(['api:*friend*', 'api:*user*']),
  FriendRequestController.acceptRequest
);

export default router;
```

## 🎯 Cache Strategies by Data Type

### Static Data (Rarely Changes)
```typescript
// Categories, settings, public info
router.get('/categories', quickCache.static()); // 1 hour
router.get('/app-config', quickCache.custom(3600)); // 1 hour
```

### Dynamic Data (Changes Frequently)
```typescript
// Posts, comments, user content
router.get('/posts', quickCache.dynamic()); // 5 minutes
router.get('/comments', quickCache.dynamic()); // 5 minutes
```

### Real-time Data (Changes Very Frequently)
```typescript
// Notifications, live feeds, counters
router.get('/notifications', quickCache.realtime()); // 1 minute
router.get('/live-feed', quickCache.custom(30)); // 30 seconds
```

### User-specific Data
```typescript
// Dashboard, personal feeds, private data
router.get('/dashboard', authMiddleware, quickCache.userSpecific()); // 10 minutes
router.get('/me/feed', authMiddleware, quickCache.userSpecific()); // 10 minutes
```

## 🧹 Cache Invalidation Patterns

### Automatic Invalidation

```typescript
import { CacheInvalidator } from '@src/MiddleWares/universal-cache.middleware';

// In your service layer
export class PostService {
  static async createPost(postData: any) {
    const post = await PostModel.create(postData);
    
    // Invalidate related caches
    await CacheInvalidator.invalidateEntity('posts');
    await CacheInvalidator.invalidateUser(postData.authorId);
    
    return post;
  }
  
  static async updatePost(postId: string, updateData: any) {
    const post = await PostModel.findByIdAndUpdate(postId, updateData);
    
    // Invalidate specific post and related caches
    await CacheInvalidator.invalidateEntity('posts', postId);
    await CacheInvalidator.invalidateRoute('/api/posts');
    
    return post;
  }
}
```

### Manual Invalidation

```typescript
// Invalidate specific patterns
await CacheInvalidator.invalidatePattern('api:*posts*');

// Invalidate by entity type
await CacheInvalidator.invalidateEntity('posts');
await CacheInvalidator.invalidateEntity('posts', 'specific-post-id');

// Invalidate user-specific caches
await CacheInvalidator.invalidateUser('user-id');

// Invalidate by route
await CacheInvalidator.invalidateRoute('/api/posts');
```

## 📊 Benefits of Universal Cache

### ✅ Advantages

1. **Single Implementation**: One middleware for all APIs
2. **Automatic Key Generation**: No manual cache key management
3. **Flexible Configuration**: Customize per route or use presets
4. **Built-in Invalidation**: Easy cache cleanup
5. **Type Safety**: Full TypeScript support
6. **Performance**: Automatic caching without code changes

### 🔄 Migration from Specific Middleware

```typescript
// Before (specific middleware)
router.get('/posts', postsCacheMiddleware, PostController.getPosts);

// After (universal middleware)
router.get('/posts', quickCache.dynamic(), PostController.getPosts);
```

### 🎛️ Configuration Comparison

```typescript
// Specific middleware (more code)
export const postsCacheMiddleware = cacheMiddleware({
  ttl: 600,
  prefix: 'posts',
  keyGenerator: (req) => {
    const { page = 1, limit = 10, category } = req.query;
    return `list:${page}:${limit}:${category || ''}`;
  }
});

// Universal middleware (less code, same result)
router.get('/posts', quickCache.list(), PostController.getPosts);
```

## 🚀 Implementation Steps

1. **Replace Existing Middleware**:
   ```typescript
   // Remove specific cache middleware imports
   // import { postsCacheMiddleware } from '@src/MiddleWares/cache.middleware';
   
   // Add universal cache import
   import { quickCache } from '@src/MiddleWares/universal-cache.middleware';
   ```

2. **Update Routes**:
   ```typescript
   // Replace specific middleware with universal
   router.get('/posts', quickCache.dynamic(), PostController.getPosts);
   ```

3. **Add Cache Invalidation**:
   ```typescript
   router.post('/posts', 
     authMiddleware,
     invalidateCache(['api:*posts*']),
     PostController.createPost
   );
   ```

4. **Monitor Performance**:
   - Check Redis logs for cache hit/miss ratios
   - Monitor response times
   - Adjust TTL values based on usage patterns

The universal cache middleware eliminates the need for endpoint-specific caching code while providing more flexibility and easier maintenance! 🎉
