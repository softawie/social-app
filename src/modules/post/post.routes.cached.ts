import { Router } from 'express';
import { PostController } from './post.controller';
import { requirePostOwnership, requireAdmin, optionalAuth } from './post.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { 
  postsCacheMiddleware, 
  commentsCacheMiddleware,
  invalidateCacheMiddleware,
  cacheInvalidationPatterns 
} from '@src/MiddleWares/cache.middleware';
import { rateLimiters } from '@src/MiddleWares/redis-rate-limit.middleware';

const router = Router();

// Public routes (with caching)
router.get('/', 
  optionalAuth, 
  postsCacheMiddleware, 
  PostController.getPosts
);

router.get('/:id', 
  optionalAuth, 
  PostController.getPostById
);

// Protected routes (with rate limiting and cache invalidation)
router.post('/', 
  authenticationMiddleware,
  rateLimiters.createPost,
  invalidateCacheMiddleware(['cache:posts:*']),
  PostController.createPost
);

router.put('/:id', 
  authenticationMiddleware, 
  requirePostOwnership,
  invalidateCacheMiddleware((req) => cacheInvalidationPatterns.post(req.params.id)),
  PostController.updatePost
);

router.delete('/:id', 
  authenticationMiddleware, 
  requirePostOwnership,
  invalidateCacheMiddleware((req) => cacheInvalidationPatterns.post(req.params.id)),
  PostController.deletePost
);

// Like/Unlike routes
router.post('/like', 
  authenticationMiddleware,
  rateLimiters.general,
  invalidateCacheMiddleware((req) => cacheInvalidationPatterns.post(req.body.postId)),
  PostController.toggleLike
);

// Comment routes (with caching and rate limiting)
router.post('/comments', 
  authenticationMiddleware,
  rateLimiters.createComment,
  invalidateCacheMiddleware((req) => cacheInvalidationPatterns.comment(req.body.postId, '')),
  PostController.createComment
);

router.get('/:postId/comments', 
  optionalAuth, 
  commentsCacheMiddleware,
  PostController.getComments
);

router.put('/comments/:commentId', 
  authenticationMiddleware,
  invalidateCacheMiddleware((req) => {
    // We need to get the post ID from the comment, this is a simplified example
    return ['cache:comments:*', `cache:comments:single:${req.params.commentId}`];
  }),
  PostController.updateComment
);

router.delete('/comments/:commentId', 
  authenticationMiddleware,
  invalidateCacheMiddleware((req) => {
    return ['cache:comments:*', `cache:comments:single:${req.params.commentId}`];
  }),
  PostController.deleteComment
);

// Report routes
router.post('/report', 
  authenticationMiddleware,
  rateLimiters.general,
  PostController.reportPost
);

// Statistics routes (cached for admins)
router.get('/stats/global', 
  authenticationMiddleware, 
  requireAdmin, 
  PostController.getPostStats
);

router.get('/stats/user', 
  authenticationMiddleware, 
  PostController.getUserPostStats
);

export default router;
