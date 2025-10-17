import { Router } from 'express';
import { CommentController } from './comment.controller';
import { requireCommentOwnership, requireAdmin, optionalAuth } from './comment.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// Public routes (no authentication required) - with caching
router.get('/', optionalAuth, quickCache.dynamic(), CommentController.getComments); // Get comments with optional auth for personalization
router.get('/:commentId', optionalAuth, quickCache.dynamic(), CommentController.getCommentById); // Get single comment

// Protected routes (authentication required) - with cache invalidation
router.post('/', 
  authenticationMiddleware, 
  invalidateCache((req) => [
    `api:*posts*${req.body.postId}*`,
    'api:*comments*',
    `api:*user:${req.user?.id}*`
  ]),
  CommentController.createComment
); // Create new comment or reply

router.put('/:commentId', 
  authenticationMiddleware, 
  requireCommentOwnership, 
  invalidateCache((req) => [
    `api:*comments*${req.params.commentId}*`,
    'api:*comments*',
    'api:*posts*'
  ]),
  CommentController.updateComment
); // Update comment (owner or admin)

router.delete('/:commentId', 
  authenticationMiddleware, 
  requireCommentOwnership, 
  invalidateCache(['api:*comments*', 'api:*posts*']),
  CommentController.deleteComment
); // Delete comment (owner or admin)

// Statistics routes - with caching
router.get('/stats/global', authenticationMiddleware, requireAdmin, quickCache.dynamic(), CommentController.getCommentStats); // Global comment stats (admin only)

export default router;
