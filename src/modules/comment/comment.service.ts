import { CommentRepository } from '@db/resposetories/comment.repo';
import { PostModel } from '@db/models/post.model';
import { AppException } from '@src/exceptions/app.exception';
import {
  CreateCommentDto,
  UpdateCommentDto,
  GetCommentsQueryDto,
  CommentResponseDto,
  CommentStatsDto,
} from './comment.dto';

export class CommentService {
  private static commentRepo = new CommentRepository();

  /**
   * Create a new comment or reply
   */
  static async createComment(userId: string, commentData: CreateCommentDto): Promise<CommentResponseDto> {
    try {
      // Verify post exists
      const post = await PostModel.findById(commentData.postId);
      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // If it's a reply, verify parent comment exists and belongs to the same post
      if (commentData.parentCommentId) {
        const parentComment = await this.commentRepo.findById(commentData.parentCommentId);
        if (!parentComment) {
          throw new AppException('Parent comment not found', 404);
        }
        if (parentComment.postId.toString() !== commentData.postId) {
          throw new AppException('Parent comment does not belong to this post', 400);
        }
      }

      // Create the comment
      const comments = await this.commentRepo.create({
        data: [{
          content: commentData.content,
          postId: commentData.postId as any,
          userId: userId as any,
          parentCommentId: commentData.parentCommentId as any,
        }],
      });

      if (!comments || comments.length === 0) {
        throw new AppException('Failed to create comment', 500);
      }

      const comment = comments[0];
      await comment.populate('userId', 'firstName lastName profileImage');

      return this.formatCommentResponse(comment);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to create comment', 500);
    }
  }

  /**
   * Get comments for a post with pagination
   */
  static async getComments(query: GetCommentsQueryDto): Promise<{
    comments: CommentResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 10, postId, parentCommentId } = query;

      let comments;
      let total;

      if (postId && !parentCommentId) {
        // Get top-level comments for a post
        comments = await this.commentRepo.findByPostId(postId, page, limit);
        total = await this.commentRepo.countByPostId(postId);
      } else if (parentCommentId) {
        // Get replies to a specific comment
        comments = await this.commentRepo.findRepliesByCommentId(parentCommentId, page, limit);
        total = await this.commentRepo.countRepliesByCommentId(parentCommentId);
      } else {
        throw new AppException('Either postId or parentCommentId is required', 400);
      }

      // Get reply counts for each comment
      const formattedComments = await Promise.all(
        comments.map(async (comment) => {
          const repliesCount = await this.commentRepo.countRepliesByCommentId(comment._id.toString());
          return this.formatCommentResponse(comment, repliesCount);
        })
      );

      return {
        comments: formattedComments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to fetch comments', 500);
    }
  }

  /**
   * Get a single comment by ID
   */
  static async getCommentById(commentId: string): Promise<CommentResponseDto> {
    try {
      const comment = await this.commentRepo.findById(commentId);
      if (!comment) {
        throw new AppException('Comment not found', 404);
      }

      const repliesCount = await this.commentRepo.countRepliesByCommentId(commentId);
      return this.formatCommentResponse(comment, repliesCount);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to fetch comment', 500);
    }
  }

  /**
   * Update a comment
   */
  static async updateComment(
    commentId: string,
    userId: string,
    updateData: UpdateCommentDto
  ): Promise<CommentResponseDto> {
    try {
      // Verify comment exists and belongs to user
      const existingComment = await this.commentRepo.findByIdAndUserId(commentId, userId);
      if (!existingComment) {
        throw new AppException('Comment not found or you do not have permission to update it', 404);
      }

      // Update the comment
      const updatedComment = await this.commentRepo.updateByIdAndUserId(commentId, userId, updateData);
      if (!updatedComment) {
        throw new AppException('Failed to update comment', 500);
      }

      const repliesCount = await this.commentRepo.countRepliesByCommentId(commentId);
      return this.formatCommentResponse(updatedComment, repliesCount);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to update comment', 500);
    }
  }

  /**
   * Delete a comment
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    try {
      // Verify comment exists and belongs to user
      const existingComment = await this.commentRepo.findByIdAndUserId(commentId, userId);
      if (!existingComment) {
        throw new AppException('Comment not found or you do not have permission to delete it', 404);
      }

      // Delete the comment
      await this.commentRepo.deleteByIdAndUserId(commentId, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to delete comment', 500);
    }
  }

  /**
   * Get comment statistics
   */
  static async getCommentStats(): Promise<CommentStatsDto> {
    try {
      // This would require aggregation queries - simplified version
      const totalComments = await this.commentRepo.model.countDocuments();
      const totalReplies = await this.commentRepo.model.countDocuments({ parentCommentId: { $ne: null } });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const commentsToday = await this.commentRepo.model.countDocuments({ createdAt: { $gte: today } });

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const commentsThisWeek = await this.commentRepo.model.countDocuments({ createdAt: { $gte: weekAgo } });

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const commentsThisMonth = await this.commentRepo.model.countDocuments({ createdAt: { $gte: monthAgo } });

      return {
        totalComments,
        totalReplies,
        commentsToday,
        commentsThisWeek,
        commentsThisMonth,
      };
    } catch (error) {
      throw new AppException('Failed to fetch comment statistics', 500);
    }
  }

  /**
   * Format comment response
   */
  private static formatCommentResponse(comment: any, repliesCount: number = 0): CommentResponseDto {
    return {
      id: comment._id.toString(),
      content: comment.content,
      postId: comment.postId.toString(),
      userId: comment.userId._id?.toString() || comment.userId.toString(),
      author: {
        id: comment.userId._id?.toString() || comment.userId.toString(),
        firstName: comment.userId.firstName,
        lastName: comment.userId.lastName,
        profileImage: comment.userId.profileImage,
      },
      parentCommentId: comment.parentCommentId?.toString(),
      repliesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
