import { Request, Response } from 'express';
import { FriendRequestService } from './friend-request.service';
import { AppException } from '@src/exceptions/app.exception';
import { handleControllerError } from '@utils/error-handler.utils';
import {
  sendFriendRequestValidation,
  getFriendRequestsValidation,
  friendRequestIdValidation,
  userIdValidation,
} from './friend-request.validation';

export class FriendRequestController {
  /**
   * Send a friend request
   */
  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request body
      const validatedData = sendFriendRequestValidation.parse(req.body);

      // Send the friend request
      const request = await FriendRequestService.sendFriendRequest(userId, validatedData);

      res.status(201).json({
        success: true,
        message: 'Friend request sent successfully',
        data: request,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get friend requests with pagination and filters
   */
  static async getFriendRequests(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate query parameters
      const validatedQuery = getFriendRequestsValidation.parse(req.query);

      // Get friend requests
      const result = await FriendRequestService.getFriendRequests(userId, validatedQuery);

      res.status(200).json({
        success: true,
        message: 'Friend requests retrieved successfully',
        data: result.requests,
        pagination: result.pagination,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request ID
      const { requestId } = friendRequestIdValidation.parse(req.params);

      // Accept the friend request
      const request = await FriendRequestService.acceptFriendRequest(requestId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend request accepted successfully',
        data: request,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request ID
      const { requestId } = friendRequestIdValidation.parse(req.params);

      // Reject the friend request
      await FriendRequestService.rejectFriendRequest(requestId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend request rejected successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate request ID
      const { requestId } = friendRequestIdValidation.parse(req.params);

      // Cancel the friend request
      await FriendRequestService.cancelFriendRequest(requestId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend request cancelled successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Remove a friend (unfriend)
   */
  static async removeFriend(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate friend user ID
      const { userId: friendId } = userIdValidation.parse(req.params);

      // Remove the friend
      await FriendRequestService.removeFriend(friendId, userId);

      res.status(200).json({
        success: true,
        message: 'Friend removed successfully',
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get friendship status with another user
   */
  static async getFriendshipStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Validate other user ID
      const { userId: otherUserId } = userIdValidation.parse(req.params);

      // Get friendship status
      const status = await FriendRequestService.getFriendshipStatus(userId, otherUserId);

      res.status(200).json({
        success: true,
        message: 'Friendship status retrieved successfully',
        data: status,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }

  /**
   * Get friend request statistics
   */
  static async getFriendRequestStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppException('User not authenticated', 401);
      }

      // Get friend request statistics
      const stats = await FriendRequestService.getFriendRequestStats(userId);

      res.status(200).json({
        success: true,
        message: 'Friend request statistics retrieved successfully',
        data: stats,
      });
    } catch (error: unknown) {
      return handleControllerError(error, res);
    }
  }
}
