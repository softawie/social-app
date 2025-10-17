// Post DTOs (Data Transfer Objects)
import { PostVisibility, PostSortBy, SortOrder, ReportReason } from '@utils/enums';

export interface CreatePostDto {
  content: string;
  images?: string[];
  tags?: string[];
  visibility?: PostVisibility;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface UpdatePostDto {
  content?: string;
  images?: string[];
  tags?: string[];
  visibility?: PostVisibility;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface GetPostsQueryDto {
  page?: number;
  limit?: number;
  userId?: string;
  tag?: string;
  visibility?: PostVisibility;
  search?: string;
  sortBy?: PostSortBy;
  sortOrder?: SortOrder;
}

export interface PostResponseDto {
  id: string;
  content: string;
  images: string[];
  tags: string[];
  visibility: PostVisibility;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  userId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  likes: number;
  comments: number;
  isLiked: boolean; // Whether current user liked this post
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentDto {
  postId: string;
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentDto {
  commentId: string;
  content: string;
}

export interface CommentResponseDto {
  id: string;
  content: string;
  postId: string;
  userId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  parentCommentId?: string;
  replies?: CommentResponseDto[];
  likes: number;
  isLiked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LikePostDto {
  postId: string;
}

export interface ReportPostDto {
  postId: string;
  reason: ReportReason;
  description?: string;
}

export interface PostStatsDto {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
}

export interface UserPostStatsDto {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  averageLikesPerPost: number;
  mostLikedPost?: {
    id: string;
    content: string;
    likes: number;
  };
}
