import { Router } from 'express';
import { PostController } from './post.controller';
import {  requirePostOwnership, requireAdmin, optionalAuth } from './post.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// Public routes (no authentication required) - with caching
router.get('/', optionalAuth, quickCache.list(), PostController.getPosts); // Get all public posts (with optional auth for personalization)
router.get('/:id', optionalAuth, quickCache.dynamic(), PostController.getPostById); // Get single post (with optional auth)

// Protected routes (authentication required) - with cache invalidation
router.post('/', 
  authenticationMiddleware, 
  invalidateCache(['api:*posts*', 'api:*stats*']),
  PostController.createPost
); // Create new post

router.put('/:id', 
  authenticationMiddleware, 
  requirePostOwnership, 
  invalidateCache((req) => [
    `api:*posts*${req.params.id}*`,
    'api:*posts*list*',
    `api:*user:${req.user?.id}*`
  ]),
  PostController.updatePost
); // Update post (owner only)

router.delete('/:id', 
  authenticationMiddleware, 
  requirePostOwnership, 
  invalidateCache(['api:*posts*', 'api:*stats*']),
  PostController.deletePost
); // Delete post (owner or admin)

// Like/Unlike routes - with cache invalidation
router.post('/like', 
  authenticationMiddleware, 
  invalidateCache((req) => [
    `api:*posts*${req.body.postId}*`,
    `api:*user:${req.user?.id}*`
  ]),
  PostController.toggleLike
); // Like or unlike a post

// Comment routes - with caching and invalidation
router.post('/comments', 
  authenticationMiddleware, 
  invalidateCache((req) => [
    `api:*posts*${req.body.postId}*`,
    'api:*comments*',
    `api:*user:${req.user?.id}*`
  ]),
  PostController.createComment
); // Create comment

router.get('/:postId/comments', optionalAuth, quickCache.dynamic(), PostController.getComments); // Get comments for a post

router.put('/comments/:commentId', 
  authenticationMiddleware, 
  invalidateCache(['api:*comments*', 'api:*posts*']),
  PostController.updateComment
); // Update comment (owner only)

router.delete('/comments/:commentId', 
  authenticationMiddleware, 
  invalidateCache(['api:*comments*', 'api:*posts*']),
  PostController.deleteComment
); // Delete comment (owner or admin)

// Report routes
router.post('/report', 
  authenticationMiddleware, 
  PostController.reportPost
); // Report a post

// Statistics routes - with caching
router.get('/stats/global', authenticationMiddleware, requireAdmin, quickCache.dynamic(), PostController.getPostStats); // Global post stats (admin only)
router.get('/stats/user', authenticationMiddleware, quickCache.userSpecific(), PostController.getUserPostStats); // User's post stats

export default router;
