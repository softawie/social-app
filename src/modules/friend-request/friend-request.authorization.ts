import { Request, Response, NextFunction } from 'express';
import UserModel from '@db/models/user.model';
import { FriendRequestRepository } from '@db/resposetories/friend-request.repo';
import { verifyToken } from '@utils/token.utils';
import { AppException } from '@src/exceptions/app.exception';
import { UserRoles } from '@utils/enums';

// Extend Request interface to include user and friendRequest
declare global {
  namespace Express {
    interface Request {
      user?: any;
      friendRequest?: any;
    }
  }
}

/**
 * Middleware to check if user can access the friend request
 * (either sender or receiver)
 */
export const requireFriendRequestAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const requestId = req.params.requestId;

    if (!userId) {
      throw new AppException('User not authenticated', 401);
    }

    if (!requestId) {
      throw new AppException('Friend request ID is required', 400);
    }

    const friendRequestRepo = new FriendRequestRepository();
    const friendRequest = await friendRequestRepo.findById(requestId);

    if (!friendRequest) {
      throw new AppException('Friend request not found', 404);
    }

    // Check if user is either sender or receiver of the friend request
    const isSender = friendRequest.senderId._id.toString() === userId;
    const isReceiver = friendRequest.receiverId._id.toString() === userId;
    const isAdmin = req.user.role === UserRoles.ADMIN;

    if (!isSender && !isReceiver && !isAdmin) {
      throw new AppException('You do not have permission to access this friend request', 403);
    }

    // Attach friend request to request for use in controller
    req.friendRequest = friendRequest;
    next();
  } catch (error) {
    if (error instanceof AppException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppException('User not authenticated', 401);
    }

    if (user.role !== UserRoles.ADMIN) {
      throw new AppException('Admin access required', 403);
    }

    next();
  } catch (error) {
    if (error instanceof AppException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
