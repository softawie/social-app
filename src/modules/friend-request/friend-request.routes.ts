import { Router } from 'express';
import { FriendRequestController } from './friend-request.controller';
import { requireFriendRequestAccess, requireAdmin } from './friend-request.authorization';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { quickCache, invalidateCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// All routes require authentication
router.use(authenticationMiddleware);

// Friend request management - with cache invalidation
router.post('/send', 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    `api:*user:${req.body.recipientId}*`,
    'api:*friend*'
  ]),
  FriendRequestController.sendFriendRequest
); // Send friend request

router.get('/', quickCache.userSpecific(), FriendRequestController.getFriendRequests); // Get friend requests (received/sent/friends)

router.put('/:requestId/accept', 
  requireFriendRequestAccess, 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    'api:*friend*'
  ]),
  FriendRequestController.acceptFriendRequest
); // Accept friend request

router.put('/:requestId/reject', 
  requireFriendRequestAccess, 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    'api:*friend*'
  ]),
  FriendRequestController.rejectFriendRequest
); // Reject friend request

router.delete('/:requestId/cancel', 
  requireFriendRequestAccess, 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    'api:*friend*'
  ]),
  FriendRequestController.cancelFriendRequest
); // Cancel sent friend request

// Friend management - with caching and invalidation
router.delete('/friends/:userId', 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    `api:*user:${req.params.userId}*`,
    'api:*friend*'
  ]),
  FriendRequestController.removeFriend
); // Remove friend (unfriend)

router.get('/status/:userId', quickCache.userSpecific(), FriendRequestController.getFriendshipStatus); // Get friendship status with user

// Statistics - with caching
router.get('/stats', quickCache.userSpecific(), FriendRequestController.getFriendRequestStats); // Get user's friend request stats

export default router;
