import { Router } from 'express';
import { CommentController } from './comment.controller';
import { requireCommentOwnership, requireAdmin, optionalAuth } from './comment.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/', optionalAuth, CommentController.getComments); // Get comments with optional auth for personalization
router.get('/:commentId', optionalAuth, CommentController.getCommentById); // Get single comment

// Protected routes (authentication required)
router.post('/', authenticationMiddleware, CommentController.createComment); // Create new comment or reply
router.put('/:commentId', authenticationMiddleware, requireCommentOwnership, CommentController.updateComment); // Update comment (owner or admin)
router.delete('/:commentId', authenticationMiddleware, requireCommentOwnership, CommentController.deleteComment); // Delete comment (owner or admin)

// Statistics routes
router.get('/stats/global', authenticationMiddleware, requireAdmin, CommentController.getCommentStats); // Global comment stats (admin only)

export default router;
