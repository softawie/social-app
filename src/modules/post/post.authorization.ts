import { Request, Response, NextFunction } from 'express';
import UserModel from '@db/models/user.model';
import { PostModel } from '@db/models/post.model';
import { verifyToken } from '@utils/token.utils';
import { AppException } from '@src/exceptions/app.exception';

// Extend Request interface to include user and post
declare global {
  namespace Express {
    interface Request {
      user?: any;
      post?: any;
    }
  }
}

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('admin ')) {
      throw new AppException('Access token is required', 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw new AppException('Access token is required', 401);
    }

    // Verify the token
    const decoded = verifyToken({ token }) as any;
    
    if (!decoded || !decoded.userId) {
      throw new AppException('Invalid access token', 401);
    }

    // Check if user exists and is active
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      throw new AppException('User not found', 401);
    }

    if (!(user as any).confirmEmail) {
      throw new AppException('Please confirm your email first', 401);
    }

    // Add user to request object
    req.user = {
      id: (user as any)._id.toString(),
      email: (user as any).email,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      role: (user as any).role,
    };

    next();
  } catch (error) {
    if (error instanceof AppException) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid access token',
    });
  }
};

/**
 * Middleware to check if user owns the post or is admin
 */
export const requirePostOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = req.params.id || req.params.postId;
    const userId = req.user?.id;

    if (!postId) {
      throw new AppException('Post ID is required', 400);
    }

    if (!userId) {
      throw new AppException('User not authenticated', 401);
    }

    // Find the post
    const post = await PostModel.findById(postId);
    
    if (!post) {
      throw new AppException('Post not found', 404);
    }

    // Check if user owns the post or is admin
    const isOwner = post.userId.toString() === userId;
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new AppException('You can only modify your own posts', 403);
    }

    // Add post to request object for use in controller
    req.post = post;

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
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
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

/**
 * Optional auth middleware - doesn't throw error if no token
 * Used for endpoints that work for both authenticated and non-authenticated users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without user
    }

    // Verify the token
    const decoded = verifyToken({ token }) as any;
    
    if (!decoded || !decoded.userId) {
      return next(); // Continue without user
    }

    // Check if user exists
    const user = await UserModel.findById(decoded.userId);
    
    if (!user || !(user as any).confirmEmail) {
      return next(); // Continue without user
    }

    // Add user to request object
    req.user = {
      id: (user as any)._id.toString(),
      email: (user as any).email,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,
      role: (user as any).role,
    };

    next();
  } catch (error) {
    // If there's any error, just continue without user
    next();
  }
};
