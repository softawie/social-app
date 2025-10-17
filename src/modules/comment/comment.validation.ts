import { z } from 'zod';
import { generalValidations } from '@utils/general.valiations';

// Create comment validation
export const createCommentValidation = z
  .object({
    postId: generalValidations.userId,
    content: z
      .string()
      .min(1, 'Comment content is required')
      .max(500, 'Comment content cannot exceed 500 characters')
      .trim(),
    parentCommentId: generalValidations.userId.optional(),
  })
  .strip();

// Update comment validation
export const updateCommentValidation = z
  .object({
    content: z
      .string()
      .min(1, 'Comment content is required')
      .max(500, 'Comment content cannot exceed 500 characters')
      .trim(),
  })
  .strip();

// Get comments validation
export const getCommentsValidation = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    postId: generalValidations.userId.optional(),
    parentCommentId: generalValidations.userId.optional(),
  })
  .strip();

// Comment ID validation
export const commentIdValidation = z
  .object({
    commentId: generalValidations.userId,
  })
  .strip();

// Delete comment validation
export const deleteCommentValidation = z
  .object({
    commentId: generalValidations.userId,
  })
  .strip();
