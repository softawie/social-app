import { Router } from 'express';
import { PostController } from './post.controller';
import {  requirePostOwnership, requireAdmin, optionalAuth } from './post.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/', optionalAuth, PostController.getPosts); // Get all public posts (with optional auth for personalization)
router.get('/:id', optionalAuth, PostController.getPostById); // Get single post (with optional auth)

// Protected routes (authentication required)
router.post('/', authenticationMiddleware, PostController.createPost); // Create new post
router.put('/:id', authenticationMiddleware, requirePostOwnership, PostController.updatePost); // Update post (owner only)
router.delete('/:id', authenticationMiddleware, requirePostOwnership, PostController.deletePost); // Delete post (owner or admin)

// Like/Unlike routes
router.post('/like', authenticationMiddleware, PostController.toggleLike); // Like or unlike a post

// Comment routes
router.post('/comments', authenticationMiddleware, PostController.createComment); // Create comment
router.get('/:postId/comments', optionalAuth, PostController.getComments); // Get comments for a post
router.put('/comments/:commentId', authenticationMiddleware, PostController.updateComment); // Update comment (owner only)
router.delete('/comments/:commentId', authenticationMiddleware, PostController.deleteComment); // Delete comment (owner or admin)

// Report routes
router.post('/report', authenticationMiddleware, PostController.reportPost); // Report a post

// Statistics routes
router.get('/stats/global', authenticationMiddleware, requireAdmin, PostController.getPostStats); // Global post stats (admin only)
router.get('/stats/user', authenticationMiddleware, PostController.getUserPostStats); // User's post stats

export default router;
