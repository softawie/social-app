import { Request, Response } from 'express';
import { PostService } from './post.service';
import { AppException } from '@src/exceptions/app.exception';
import { handleControllerError } from '@utils/error-handler.utils';
import {
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  postIdValidation,
  likePostValidation,
  createCommentValidation,
  updateCommentValidation,
  deleteCommentValidation,
  getCommentsValidation,
  reportPostValidation,
} from './post.validation';

export class PostController {
  /**
   * Create a new post
   */
  static async createPost(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = createPostValidation.parse(req.body);

      // Create the post
      const post = await PostService.createPost(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Post created successfully',
        data: post,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get posts with pagination and filters
   */
  static async getPosts(req: Request, res: Response) {
    try {
      // Validate query parameters
      const validatedQuery = getPostsValidation.parse(req.query);
      const currentUserId = req.user?.id;

      // Get posts
      const result = await PostService.getPosts(validatedQuery, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Posts retrieved successfully',
        data: result.posts,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get a single post by ID
   */
  static async getPostById(req: Request, res: Response) {
    try {
      // Validate parameters
      const { id } = postIdValidation.parse(req.params);
      const currentUserId = req.user?.id;

      // Get the post
      const post = await PostService.getPostById(id, currentUserId);

      res.status(200).json({
        success: true,
        message: 'Post retrieved successfully',
        data: post,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Update a post
   */
  static async updatePost(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate parameters and body
      const { id } = postIdValidation.parse(req.params);
      const validatedData = updatePostValidation.parse(req.body);

      // Update the post
      const post = await PostService.updatePost(id, userId, validatedData);

      res.status(200).json({
        success: true,
        message: 'Post updated successfully',
        data: post,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Delete a post
   */
  static async deletePost(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate parameters
      const { id } = postIdValidation.parse(req.params);

      // Delete the post
      await PostService.deletePost(id, userId);

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Like or unlike a post
   */
  static async toggleLike(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = likePostValidation.parse(req.body);

      // Toggle like
      const result = await PostService.toggleLike(userId, validatedData);

      res.status(200).json({
        success: true,
        message: result.liked ? 'Post liked successfully' : 'Post unliked successfully',
        data: result,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Create a comment on a post
   */
  static async createComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = createCommentValidation.parse(req.body);

      // Create the comment
      const comment = await PostService.createComment(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        data: comment,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get comments for a post
   */
  static async getComments(req: Request, res: Response) {
    try {
      // Validate query parameters
      const validatedQuery = getCommentsValidation.parse({
        ...req.query,
        ...req.params,
      });
      const currentUserId = req.user?.id;

      // Get comments
      const result = await PostService.getComments(
        validatedQuery.postId,
        validatedQuery.page,
        validatedQuery.limit,
        validatedQuery.sortOrder,
        currentUserId
      );

      res.status(200).json({
        success: true,
        message: 'Comments retrieved successfully',
        data: result.comments,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = updateCommentValidation.parse({
        ...req.body,
        ...req.params,
      });

      // Update the comment
      const comment = await PostService.updateComment(
        validatedData.commentId,
        userId,
        validatedData.content
      );

      res.status(200).json({
        success: true,
        message: 'Comment updated successfully',
        data: comment,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate parameters
      const validatedData = deleteCommentValidation.parse(req.params);

      // Delete the comment
      await PostService.deleteComment(validatedData.commentId, userId);

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Report a post
   */
  static async reportPost(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = reportPostValidation.parse(req.body);

      // Report the post
      await PostService.reportPost(userId, validatedData);

      res.status(200).json({
        success: true,
        message: 'Post reported successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get post statistics (admin only)
   */
  static async getPostStats(req: Request, res: Response) {
    try {
      // Get statistics
      const stats = await PostService.getPostStats();

      res.status(200).json({
        success: true,
        message: 'Post statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      if (error instanceof AppException) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Get user's post statistics
   */
  static async getUserPostStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Get user statistics
      const stats = await PostService.getUserPostStats(userId);

      res.status(200).json({
        success: true,
        message: 'User post statistics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      if (error instanceof AppException) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
}
