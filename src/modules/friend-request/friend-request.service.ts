import { FriendRequestRepository } from '@db/resposetories/friend-request.repo';
import UserModel from '@db/models/user.model';
import { FriendRequestStatus } from '@db/models/friend-request.model';
import { AppException } from '@src/exceptions/app.exception';
import {
  SendFriendRequestDto,
  UpdateFriendRequestDto,
  GetFriendRequestsQueryDto,
  FriendRequestResponseDto,
  FriendResponseDto,
  FriendRequestStatsDto,
} from './friend-request.dto';

export class FriendRequestService {
  private static friendRequestRepo = new FriendRequestRepository();

  /**
   * Send a friend request
   */
  static async sendFriendRequest(senderId: string, requestData: SendFriendRequestDto): Promise<FriendRequestResponseDto> {
    try {
      const { receiverId } = requestData;

      // Prevent sending friend request to oneself
      if (senderId === receiverId) {
        throw new AppException('Cannot send friend request to yourself', 400);
      }

      // Check if receiver exists
      const receiver = await UserModel.findById(receiverId);
      if (!receiver) {
        throw new AppException('User not found', 404);
      }

      // Check if there's already a pending request between these users
      const existingRequest = await this.friendRequestRepo.findPendingRequestsBetweenUsers(senderId, receiverId);
      if (existingRequest) {
        throw new AppException('Friend request already exists between these users', 400);
      }

      // Check if they are already friends
      const areFriends = await this.friendRequestRepo.areFriends(senderId, receiverId);
      if (areFriends) {
        throw new AppException('You are already friends with this user', 400);
      }

      // Create the friend request
      const requests = await this.friendRequestRepo.create({
        data: [{
          senderId: senderId as any,
          receiverId: receiverId as any,
          status: FriendRequestStatus.PENDING,
        }],
      });

      if (!requests || requests.length === 0) {
        throw new AppException('Failed to send friend request', 500);
      }

      const request = requests[0];
      await request.populate([
        { path: 'senderId', select: 'firstName lastName email profileImage' },
        { path: 'receiverId', select: 'firstName lastName email profileImage' }
      ]);

      return this.formatFriendRequestResponse(request);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to send friend request', 500);
    }
  }

  /**
   * Get friend requests with pagination and filters
   */
  static async getFriendRequests(userId: string, query: GetFriendRequestsQueryDto): Promise<{
    requests: FriendRequestResponseDto[] | FriendResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page = 1, limit = 10, type = 'received' } = query;

      let requests;
      let total;

      switch (type) {
        case 'received':
          requests = await this.friendRequestRepo.findReceivedRequests(userId, page, limit);
          total = await this.friendRequestRepo.countReceivedRequests(userId);
          break;
        case 'sent':
          requests = await this.friendRequestRepo.findSentRequests(userId, page, limit);
          total = await this.friendRequestRepo.countSentRequests(userId);
          break;
        case 'friends':
          const friendships = await this.friendRequestRepo.findFriends(userId, page, limit);
          total = await this.friendRequestRepo.countFriends(userId);
          
          // Format friends list
          const friends = friendships.map(friendship => {
            const friend = (friendship.senderId as any)._id.toString() === userId ? friendship.receiverId : friendship.senderId;
            return {
              id: (friend as any)._id.toString(),
              firstName: (friend as any).firstName,
              lastName: (friend as any).lastName,
              email: (friend as any).email,
              profileImage: (friend as any).profileImage,
              friendshipDate: friendship.updatedAt,
            };
          });

          return {
            requests: friends,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        default:
          throw new AppException('Invalid request type', 400);
      }

      const formattedRequests = requests.map(request => this.formatFriendRequestResponse(request));

      return {
        requests: formattedRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to fetch friend requests', 500);
    }
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(requestId: string, userId: string): Promise<FriendRequestResponseDto> {
    try {
      // Get the friend request
      const request = await this.friendRequestRepo.findById(requestId);
      if (!request) {
        throw new AppException('Friend request not found', 404);
      }

      // Verify that the current user is the receiver
      if ((request.receiverId as any)._id.toString() !== userId) {
        throw new AppException('You can only accept friend requests sent to you', 403);
      }

      // Check if request is still pending
      if (request.status !== FriendRequestStatus.PENDING) {
        throw new AppException('Friend request is no longer pending', 400);
      }

      // Update the request status to accepted
      const updatedRequest = await this.friendRequestRepo.updateStatus(requestId, FriendRequestStatus.ACCEPTED);
      if (!updatedRequest) {
        throw new AppException('Failed to accept friend request', 500);
      }

      return this.formatFriendRequestResponse(updatedRequest);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to accept friend request', 500);
    }
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      // Get the friend request
      const request = await this.friendRequestRepo.findById(requestId);
      if (!request) {
        throw new AppException('Friend request not found', 404);
      }

      // Verify that the current user is the receiver
      if ((request.receiverId as any)._id.toString() !== userId) {
        throw new AppException('You can only reject friend requests sent to you', 403);
      }

      // Check if request is still pending
      if (request.status !== FriendRequestStatus.PENDING) {
        throw new AppException('Friend request is no longer pending', 400);
      }

      // Update the request status to rejected
      await this.friendRequestRepo.updateStatus(requestId, FriendRequestStatus.REJECTED);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to reject friend request', 500);
    }
  }

  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      // Get the friend request
      const request = await this.friendRequestRepo.findById(requestId);
      if (!request) {
        throw new AppException('Friend request not found', 404);
      }

      // Verify that the current user is the sender
      if ((request.senderId as any)._id.toString() !== userId) {
        throw new AppException('You can only cancel friend requests you sent', 403);
      }

      // Check if request is still pending
      if (request.status !== FriendRequestStatus.PENDING) {
        throw new AppException('Friend request is no longer pending', 400);
      }

      // Delete the request
      await this.friendRequestRepo.deleteById(requestId);
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to cancel friend request', 500);
    }
  }

  /**
   * Remove a friend (unfriend)
   */
  static async removeFriend(friendId: string, userId: string): Promise<void> {
    try {
      // Check if they are friends
      const areFriends = await this.friendRequestRepo.areFriends(userId, friendId);
      if (!areFriends) {
        throw new AppException('You are not friends with this user', 400);
      }

      // Find the friendship record
      const friendship = await this.friendRequestRepo.model.findOne({
        $or: [
          { senderId: userId, receiverId: friendId, status: FriendRequestStatus.ACCEPTED },
          { senderId: friendId, receiverId: userId, status: FriendRequestStatus.ACCEPTED }
        ]
      });

      if (!friendship) {
        throw new AppException('Friendship not found', 404);
      }

      // Delete the friendship
      await this.friendRequestRepo.deleteById((friendship as any)._id.toString());
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException('Failed to remove friend', 500);
    }
  }

  /**
   * Check friendship status between two users
   */
  static async getFriendshipStatus(userId: string, otherUserId: string): Promise<{
    status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
    requestId?: string;
  }> {
    try {
      // Check if they are friends
      const areFriends = await this.friendRequestRepo.areFriends(userId, otherUserId);
      if (areFriends) {
        return { status: 'friends' };
      }

      // Check for pending requests
      const pendingRequest = await this.friendRequestRepo.findPendingRequestsBetweenUsers(userId, otherUserId);
      if (pendingRequest) {
        if (pendingRequest.senderId.toString() === userId) {
          return { status: 'pending_sent', requestId: (pendingRequest as any)._id.toString() };
        } else {
          return { status: 'pending_received', requestId: (pendingRequest as any)._id.toString() };
        }
      }

      return { status: 'none' };
    } catch (error) {
      throw new AppException('Failed to get friendship status', 500);
    }
  }

  /**
   * Get friend request statistics
   */
  static async getFriendRequestStats(userId: string): Promise<FriendRequestStatsDto> {
    try {
      const totalFriends = await this.friendRequestRepo.countFriends(userId);
      const pendingReceived = await this.friendRequestRepo.countReceivedRequests(userId);
      const pendingSent = await this.friendRequestRepo.countSentRequests(userId);

      // Calculate friends this week and month
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const friendsThisWeek = await this.friendRequestRepo.model.countDocuments({
        $or: [
          { senderId: userId, status: FriendRequestStatus.ACCEPTED },
          { receiverId: userId, status: FriendRequestStatus.ACCEPTED }
        ],
        updatedAt: { $gte: weekAgo }
      });

      const friendsThisMonth = await this.friendRequestRepo.model.countDocuments({
        $or: [
          { senderId: userId, status: FriendRequestStatus.ACCEPTED },
          { receiverId: userId, status: FriendRequestStatus.ACCEPTED }
        ],
        updatedAt: { $gte: monthAgo }
      });

      return {
        totalFriends,
        pendingReceived,
        pendingSent,
        friendsThisWeek,
        friendsThisMonth,
      };
    } catch (error) {
      throw new AppException('Failed to fetch friend request statistics', 500);
    }
  }

  /**
   * Format friend request response
   */
  private static formatFriendRequestResponse(request: any): FriendRequestResponseDto {
    return {
      id: request._id.toString(),
      senderId: request.senderId._id?.toString() || request.senderId.toString(),
      receiverId: request.receiverId._id?.toString() || request.receiverId.toString(),
      status: request.status,
      sender: {
        id: request.senderId._id?.toString() || request.senderId.toString(),
        firstName: request.senderId.firstName,
        lastName: request.senderId.lastName,
        email: request.senderId.email,
        profileImage: request.senderId.profileImage,
      },
      receiver: {
        id: request.receiverId._id?.toString() || request.receiverId.toString(),
        firstName: request.receiverId.firstName,
        lastName: request.receiverId.lastName,
        email: request.receiverId.email,
        profileImage: request.receiverId.profileImage,
      },
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
