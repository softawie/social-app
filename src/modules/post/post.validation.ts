import { z } from 'zod';
import { generalValidations } from '@utils/general.valiations';
import { PostVisibility, PostSortBy, SortOrder, ReportReason } from '@utils/enums';

// Create post validation
const createPostValidation = z
  .object({
    content: z
      .string()
      .min(1, 'Post content is required')
      .max(2000, 'Post content cannot exceed 2000 characters')
      .trim(),
    images: z
      .array(z.string().url('Invalid image URL'))
      .max(10, 'Maximum 10 images allowed')
      .optional(),
    tags: z
      .array(z.string().min(1).max(50))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
    visibility: z
      .nativeEnum(PostVisibility)
      .default(PostVisibility.PUBLIC),
    location: z
      .object({
        name: z.string().max(100).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
      .optional(),
  })
  .strip();

// Update post validation
const updatePostValidation = z
  .object({
    content: z
      .string()
      .min(1, 'Post content is required')
      .max(2000, 'Post content cannot exceed 2000 characters')
      .trim()
      .optional(),
    images: z
      .array(z.string().url('Invalid image URL'))
      .max(10, 'Maximum 10 images allowed')
      .optional(),
    tags: z
      .array(z.string().min(1).max(50))
      .max(20, 'Maximum 20 tags allowed')
      .optional(),
    visibility: z
      .nativeEnum(PostVisibility)
      .optional(),
    location: z
      .object({
        name: z.string().max(100).optional(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
      .optional(),
  })
  .strip()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided for update'
  );

// Get posts validation (query parameters)
const getPostsValidation = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    userId: generalValidations.userId.optional(),
    tag: z.string().max(50).optional(),
    visibility: z.nativeEnum(PostVisibility).optional(),
    search: z.string().max(100).optional(),
    sortBy: z.nativeEnum(PostSortBy).default(PostSortBy.CREATED_AT),
    sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  })
  .strip();

// Post ID validation
const postIdValidation = z
  .object({
    id: generalValidations.userId, // Using same validation as userId since they're both MongoDB ObjectIds
  })
  .strip();

// Like/Unlike post validation
const likePostValidation = z
  .object({
    postId: generalValidations.userId,
  })
  .strip();

// Comment validation
const createCommentValidation = z
  .object({
    postId: generalValidations.userId,
    content: z
      .string()
      .min(1, 'Comment content is required')
      .max(500, 'Comment cannot exceed 500 characters')
      .trim(),
    parentCommentId: generalValidations.userId.optional(), // For nested comments
  })
  .strip();

// Update comment validation
const updateCommentValidation = z
  .object({
    commentId: generalValidations.userId,
    content: z
      .string()
      .min(1, 'Comment content is required')
      .max(500, 'Comment cannot exceed 500 characters')
      .trim(),
  })
  .strip();

// Delete comment validation
const deleteCommentValidation = z
  .object({
    commentId: generalValidations.userId,
  })
  .strip();

// Get comments validation
const getCommentsValidation = z
  .object({
    postId: generalValidations.userId,
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
    sortOrder: z.nativeEnum(SortOrder).default(SortOrder.ASC),
  })
  .strip();

// Report post validation
const reportPostValidation = z
  .object({
    postId: generalValidations.userId,
    reason: z.nativeEnum(ReportReason),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
  })
  .strip();

export {
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
};
