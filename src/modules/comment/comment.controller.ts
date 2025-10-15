import { Request, Response } from 'express';
import { CommentService } from './comment.service';
import { AppException } from '@src/exceptions/app.exception';
import { handleControllerError } from '@utils/error-handler.utils';
import {
  createCommentValidation,
  updateCommentValidation,
  getCommentsValidation,
  commentIdValidation,
  deleteCommentValidation,
} from './comment.validation';

export class CommentController {
  /**
   * Create a new comment or reply
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
      const comment = await CommentService.createComment(userId, validatedData);

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
   * Get comments with pagination and filters
   */
  static async getComments(req: Request, res: Response) {
    try {
      // Validate query parameters
      const validatedQuery = getCommentsValidation.parse(req.query);

      // Get comments
      const result = await CommentService.getComments(validatedQuery);

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
   * Get a single comment by ID
   */
  static async getCommentById(req: Request, res: Response) {
    try {
      // Validate comment ID
      const { commentId } = commentIdValidation.parse(req.params);

      // Get the comment
      const comment = await CommentService.getCommentById(commentId);

      res.status(200).json({
        success: true,
        message: 'Comment retrieved successfully',
        data: comment,
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

      // Validate comment ID
      const { commentId } = commentIdValidation.parse(req.params);

      // Validate request body
      const validatedData = updateCommentValidation.parse(req.body);

      // Update the comment
      const comment = await CommentService.updateComment(commentId, userId, validatedData);

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

      // Validate comment ID
      const { commentId } = deleteCommentValidation.parse(req.params);

      // Delete the comment
      await CommentService.deleteComment(commentId, userId);

      res.status(200).json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get comment statistics (admin only)
   */
  static async getCommentStats(req: Request, res: Response) {
    try {
      // Get comment statistics
      const stats = await CommentService.getCommentStats();

      res.status(200).json({
        success: true,
        message: 'Comment statistics retrieved successfully',
        data: stats,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }
}
