import { Request, Response, NextFunction } from 'express';
import UserModel from '@db/models/user.model';
import { CommentRepository } from '@db/resposetories/comment.repo';
import { verifyToken } from '@utils/token.utils';
import { AppException } from '@src/exceptions/app.exception';
import { UserRoles } from '@utils/enums';

// Extend Request interface to include user and comment
declare global {
  namespace Express {
    interface Request {
      user?: any;
      comment?: any;
    }
  }
}

/**
 * Middleware to check if user is authenticated (optional)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('admin ')) {
      // No authentication provided, continue without user
      return next();
    }

    const token = authHeader.substring(7); // Remove 'admin ' prefix
    
    if (!token) {
      return next();
    }

    // Verify the token
    const decoded = verifyToken({ token }) as any;
    
    if (decoded && decoded.userId) {
      // Check if user exists and is active
      const user = await UserModel.findById(decoded.userId);
      
      if (user && (user as any).confirmEmail) {
        req.user = {
          id: (user as any)._id.toString(),
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      }
    }

    next();
  } catch (error) {
    // If there's an error in optional auth, just continue without user
    next();
  }
};

/**
 * Middleware to check if user owns the comment or is admin
 */
export const requireCommentOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const commentId = req.params.commentId;

    if (!userId) {
      throw new AppException('User not authenticated', 401);
    }

    if (!commentId) {
      throw new AppException('Comment ID is required', 400);
    }

    const commentRepo = new CommentRepository();
    const comment = await commentRepo.findById(commentId);

    if (!comment) {
      throw new AppException('Comment not found', 404);
    }

    // Check if user owns the comment or is admin
    const isOwner = comment.userId.toString() === userId;
    const isAdmin = req.user.role === UserRoles.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new AppException('You do not have permission to perform this action', 403);
    }

    // Attach comment to request for use in controller
    req.comment = comment;
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
