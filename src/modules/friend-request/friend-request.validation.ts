import { z } from 'zod';
import { generalValidations } from '@utils/general.valiations';
import { FriendRequestStatus } from '@db/models/friend-request.model';

// Send friend request validation
export const sendFriendRequestValidation = z
  .object({
    receiverId: generalValidations.userId,
  })
  .strip();

// Update friend request validation
export const updateFriendRequestValidation = z
  .object({
    status: z.nativeEnum(FriendRequestStatus),
  })
  .strip();

// Get friend requests validation
export const getFriendRequestsValidation = z
  .object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    type: z
      .enum(['received', 'sent', 'friends'])
      .optional(),
    status: z
      .nativeEnum(FriendRequestStatus)
      .optional(),
  })
  .strip();

// Friend request ID validation
export const friendRequestIdValidation = z
  .object({
    requestId: generalValidations.userId,
  })
  .strip();

// User ID validation for friend operations
export const userIdValidation = z
  .object({
    userId: generalValidations.userId,
  })
  .strip();
