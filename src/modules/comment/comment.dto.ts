// Comment DTOs (Data Transfer Objects)

export interface CreateCommentDto {
  postId: string;
  content: string;
  parentCommentId?: string;
}

export interface UpdateCommentDto {
  content: string;
}

export interface GetCommentsQueryDto {
  page?: number;
  limit?: number;
  postId?: string;
  parentCommentId?: string;
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
    profileImage?: string;
  };
  parentCommentId?: string;
  replies?: CommentResponseDto[];
  repliesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentStatsDto {
  totalComments: number;
  totalReplies: number;
  commentsToday: number;
  commentsThisWeek: number;
  commentsThisMonth: number;
}
