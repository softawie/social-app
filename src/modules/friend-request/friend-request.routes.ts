import { Router } from 'express';
import { FriendRequestController } from './friend-request.controller';
import { requireFriendRequestAccess, requireAdmin } from './friend-request.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticationMiddleware);

// Friend request management
router.post('/send', FriendRequestController.sendFriendRequest); // Send friend request
router.get('/', FriendRequestController.getFriendRequests); // Get friend requests (received/sent/friends)
router.put('/:requestId/accept', requireFriendRequestAccess, FriendRequestController.acceptFriendRequest); // Accept friend request
router.put('/:requestId/reject', requireFriendRequestAccess, FriendRequestController.rejectFriendRequest); // Reject friend request
router.delete('/:requestId/cancel', requireFriendRequestAccess, FriendRequestController.cancelFriendRequest); // Cancel sent friend request

// Friend management
router.delete('/friends/:userId', FriendRequestController.removeFriend); // Remove friend (unfriend)
router.get('/status/:userId', FriendRequestController.getFriendshipStatus); // Get friendship status with user

// Statistics
router.get('/stats', FriendRequestController.getFriendRequestStats); // Get user's friend request stats

export default router;
