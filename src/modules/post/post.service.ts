import { PostModel } from '@db/models/post.model';
import { CommentModel } from '@db/models/comment.model';
import { LikeModel } from '@db/models/like.model';
import { ReportModel } from '@db/models/report.model';
import UserModel from '@db/models/user.model';
import { AppException } from '@src/exceptions/app.exception';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsQueryDto,
  PostResponseDto,
  CreateCommentDto,
  UpdateCommentDto,
  CommentResponseDto,
  LikePostDto,
  ReportPostDto,
  PostStatsDto,
  UserPostStatsDto,
} from './post.dto';

export class PostService {
  /**
   * Create a new post
   */
  static async createPost(userId: string, postData: CreatePostDto): Promise<PostResponseDto> {
    try {
      // Create the post
      const post = await PostModel.create({
        ...postData,
        userId,
      });

      // Populate author information
      await post.populate('userId', 'firstName lastName email');

      return this.formatPostResponse(post, userId);
    } catch (error) {
      throw new AppException('Failed to create post', 500);
    }
  }

  /**
   * Get posts with pagination and filters
   */
  static async getPosts(query: GetPostsQueryDto, currentUserId?: string): Promise<{
    posts: PostResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 10,
        userId,
        tag,
        visibility,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      // Build filter object
      const filter: any = {};

      // If no current user, only show public posts
      if (!currentUserId) {
        filter.visibility = 'public';
      } else {
        // If current user exists, show public posts and user's own posts
        if (visibility) {
          filter.visibility = visibility;
        } else {
          filter.$or = [
            { visibility: 'public' },
            { userId: currentUserId }, // User's own posts
          ];
        }
      }

      if (userId) {
        filter.userId = userId;
      }

      if (tag) {
        filter.tags = { $in: [tag] };
      }

      if (search) {
        filter.$or = [
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const total = await PostModel.countDocuments(filter);
      const pages = Math.ceil(total / limit);

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Get posts
      const posts = await PostModel.find(filter)
        .populate('userId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Format posts with like/comment counts
      const formattedPosts = await Promise.all(
        posts.map(post => this.formatPostResponse(post, currentUserId))
      );

      return {
        posts: formattedPosts,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new AppException('Failed to fetch posts', 500);
    }
  }

  /**
   * Get a single post by ID
   */
  static async getPostById(postId: string, currentUserId?: string): Promise<PostResponseDto> {
    try {
      const post = await PostModel.findById(postId)
        .populate('userId', 'firstName lastName email');

      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Check visibility permissions
      if (post.visibility === 'private' && post.userId._id.toString() !== currentUserId) {
        throw new AppException('Post not found', 404);
      }

      return this.formatPostResponse(post, currentUserId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to fetch post', 500);
    }
  }

  /**
   * Update a post
   */
  static async updatePost(
    postId: string,
    userId: string,
    updateData: UpdatePostDto
  ): Promise<PostResponseDto> {
    try {
      const post = await PostModel.findById(postId);

      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Check ownership
      if (post.userId.toString() !== userId) {
        throw new AppException('You can only update your own posts', 403);
      }

      // Update the post
      const updatedPost = await PostModel.findByIdAndUpdate(
        postId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      ).populate('userId', 'firstName lastName email');

      return this.formatPostResponse(updatedPost!, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to update post', 500);
    }
  }

  /**
   * Delete a post
   */
  static async deletePost(postId: string, userId: string): Promise<void> {
    try {
      const post = await PostModel.findById(postId);

      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Check ownership (or admin)
      const user = await UserModel.findById(userId);
      const isOwner = post.userId.toString() === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new AppException('You can only delete your own posts', 403);
      }

      // Delete associated data
      await Promise.all([
        PostModel.findByIdAndDelete(postId),
        CommentModel.deleteMany({ postId }),
        LikeModel.deleteMany({ postId }),
        ReportModel.deleteMany({ postId }),
      ]);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to delete post', 500);
    }
  }

  /**
   * Like or unlike a post
   */
  static async toggleLike(userId: string, likeData: LikePostDto): Promise<{ liked: boolean; likesCount: number }> {
    try {
      const { postId } = likeData;

      // Check if post exists
      const post = await PostModel.findById(postId);
      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Check if user already liked the post
      const existingLike = await LikeModel.findOne({ userId, postId });

      if (existingLike) {
        // Unlike the post
        await LikeModel.findByIdAndDelete(existingLike._id);
        const likesCount = await LikeModel.countDocuments({ postId });
        return { liked: false, likesCount };
      } else {
        // Like the post
        await LikeModel.create({ userId, postId });
        const likesCount = await LikeModel.countDocuments({ postId });
        return { liked: true, likesCount };
      }
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to toggle like', 500);
    }
  }

  /**
   * Create a comment on a post
   */
  static async createComment(userId: string, commentData: CreateCommentDto): Promise<CommentResponseDto> {
    try {
      const { postId, content, parentCommentId } = commentData;

      // Check if post exists
      const post = await PostModel.findById(postId);
      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // If parent comment ID is provided, check if it exists
      if (parentCommentId) {
        const parentComment = await CommentModel.findById(parentCommentId);
        if (!parentComment || parentComment.postId.toString() !== postId) {
          throw new AppException('Parent comment not found', 404);
        }
      }

      // Create the comment
      const comment = await CommentModel.create({
        content,
        postId,
        userId,
        parentCommentId,
      });

      // Populate author information
      await comment.populate('userId', 'firstName lastName email');

      return this.formatCommentResponse(comment, userId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to create comment', 500);
    }
  }

  /**
   * Get comments for a post
   */
  static async getComments(
    postId: string,
    page: number = 1,
    limit: number = 10,
    sortOrder: 'asc' | 'desc' = 'asc',
    currentUserId?: string
  ): Promise<{
    comments: CommentResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      // Check if post exists
      const post = await PostModel.findById(postId);
      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Get only top-level comments (no parent)
      const filter = { postId, parentCommentId: { $exists: false } };
      
      const skip = (page - 1) * limit;
      const total = await CommentModel.countDocuments(filter);
      const pages = Math.ceil(total / limit);

      const sort: any = { createdAt: sortOrder === 'desc' ? -1 : 1 };

      const comments = await CommentModel.find(filter)
        .populate('userId', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      // Format comments and get replies
      const formattedComments = await Promise.all(
        comments.map(async (comment) => {
          const formattedComment = await this.formatCommentResponse(comment, currentUserId);
          
          // Get replies for this comment
          const replies = await CommentModel.find({ parentCommentId: comment._id })
            .populate('userId', 'firstName lastName email')
            .sort({ createdAt: 1 })
            .lean();

          formattedComment.replies = await Promise.all(
            replies.map(reply => this.formatCommentResponse(reply, currentUserId))
          );

          return formattedComment;
        })
      );

      return {
        comments: formattedComments,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
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
   * Update a comment
   */
  static async updateComment(
    commentId: string,
    userId: string,
    content: string
  ): Promise<CommentResponseDto> {
    try {
      const comment = await CommentModel.findById(commentId);

      if (!comment) {
        throw new AppException('Comment not found', 404);
      }

      // Check ownership
      if (comment.userId.toString() !== userId) {
        throw new AppException('You can only update your own comments', 403);
      }

      // Update the comment
      const updatedComment = await CommentModel.findByIdAndUpdate(
        commentId,
        { content, updatedAt: new Date() },
        { new: true }
      ).populate('userId', 'firstName lastName email');

      return this.formatCommentResponse(updatedComment!, userId);
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
      const comment = await CommentModel.findById(commentId);

      if (!comment) {
        throw new AppException('Comment not found', 404);
      }

      // Check ownership (or admin)
      const user = await UserModel.findById(userId);
      const isOwner = comment.userId.toString() === userId;
      const isAdmin = user?.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new AppException('You can only delete your own comments', 403);
      }

      // Delete the comment and its replies
      await Promise.all([
        CommentModel.findByIdAndDelete(commentId),
        CommentModel.deleteMany({ parentCommentId: commentId }),
      ]);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to delete comment', 500);
    }
  }

  /**
   * Report a post
   */
  static async reportPost(userId: string, reportData: ReportPostDto): Promise<void> {
    try {
      const { postId, reason, description } = reportData;

      // Check if post exists
      const post = await PostModel.findById(postId);
      if (!post) {
        throw new AppException('Post not found', 404);
      }

      // Check if user already reported this post
      const existingReport = await ReportModel.findOne({ userId, postId });
      if (existingReport) {
        throw new AppException('You have already reported this post', 400);
      }

      // Create the report
      await ReportModel.create({
        userId,
        postId,
        reason,
        description,
      });
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to report post', 500);
    }
  }

  /**
   * Get post statistics
   */
  static async getPostStats(): Promise<PostStatsDto> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPosts,
        totalLikes,
        totalComments,
        postsToday,
        postsThisWeek,
        postsThisMonth,
      ] = await Promise.all([
        PostModel.countDocuments(),
        LikeModel.countDocuments(),
        CommentModel.countDocuments(),
        PostModel.countDocuments({ createdAt: { $gte: today } }),
        PostModel.countDocuments({ createdAt: { $gte: thisWeek } }),
        PostModel.countDocuments({ createdAt: { $gte: thisMonth } }),
      ]);

      return {
        totalPosts,
        totalLikes,
        totalComments,
        postsToday,
        postsThisWeek,
        postsThisMonth,
      };
    } catch (error) {
      throw new AppException('Failed to fetch post statistics', 500);
    }
  }

  /**
   * Get user's post statistics
   */
  static async getUserPostStats(userId: string): Promise<UserPostStatsDto> {
    try {
      const [totalPosts, userLikes, userComments] = await Promise.all([
        PostModel.countDocuments({ userId }),
        LikeModel.countDocuments({ 
          postId: { $in: await PostModel.find({ userId }).distinct('_id') }
        }),
        CommentModel.countDocuments({ 
          postId: { $in: await PostModel.find({ userId }).distinct('_id') }
        }),
      ]);

      const averageLikesPerPost = totalPosts > 0 ? userLikes / totalPosts : 0;

      // Get most liked post
      const mostLikedPostAgg = await PostModel.aggregate([
        { $match: { userId: userId } },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'postId',
            as: 'likes'
          }
        },
        {
          $addFields: {
            likesCount: { $size: '$likes' }
          }
        },
        { $sort: { likesCount: -1 } },
        { $limit: 1 }
      ]);

      const mostLikedPost = mostLikedPostAgg.length > 0 ? {
        id: mostLikedPostAgg[0]._id.toString(),
        content: mostLikedPostAgg[0].content,
        likes: mostLikedPostAgg[0].likesCount,
      } : undefined;

      return {
        totalPosts,
        totalLikes: userLikes,
        totalComments: userComments,
        averageLikesPerPost: Math.round(averageLikesPerPost * 100) / 100,
        mostLikedPost,
      };
    } catch (error) {
      throw new AppException('Failed to fetch user post statistics', 500);
    }
  }

  /**
   * Format post response with like/comment counts and user interaction status
   */
  private static async formatPostResponse(post: any, currentUserId?: string): Promise<PostResponseDto> {
    const postId = post._id.toString();

    // Get like and comment counts
    const [likesCount, commentsCount, isLiked] = await Promise.all([
      LikeModel.countDocuments({ postId }),
      CommentModel.countDocuments({ postId }),
      currentUserId ? LikeModel.exists({ postId, userId: currentUserId }) : false,
    ]);

    return {
      id: postId,
      content: post.content,
      images: post.images || [],
      tags: post.tags || [],
      visibility: post.visibility,
      location: post.location,
      userId: post.userId._id.toString(),
      author: {
        id: post.userId._id.toString(),
        firstName: post.userId.firstName,
        lastName: post.userId.lastName,
        email: post.userId.email,
      },
      likes: likesCount,
      comments: commentsCount,
      isLiked: !!isLiked,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  /**
   * Format comment response
   */
  private static async formatCommentResponse(comment: any, currentUserId?: string): Promise<CommentResponseDto> {
    const commentId = comment._id.toString();

    // Get like count for comment (if you implement comment likes)
    const likesCount = 0; // Placeholder - implement if needed
    const isLiked = false; // Placeholder - implement if needed

    return {
      id: commentId,
      content: comment.content,
      postId: comment.postId.toString(),
      userId: comment.userId._id.toString(),
      author: {
        id: comment.userId._id.toString(),
        firstName: comment.userId.firstName,
        lastName: comment.userId.lastName,
        email: comment.userId.email,
      },
      parentCommentId: comment.parentCommentId?.toString(),
      likes: likesCount,
      isLiked,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
