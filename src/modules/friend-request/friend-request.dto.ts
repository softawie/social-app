// Friend Request DTOs (Data Transfer Objects)
import { FriendRequestStatus } from '@db/models/friend-request.model';

export interface SendFriendRequestDto {
  receiverId: string;
}

export interface UpdateFriendRequestDto {
  status: FriendRequestStatus;
}

export interface GetFriendRequestsQueryDto {
  page?: number;
  limit?: number;
  type?: 'received' | 'sent' | 'friends';
  status?: FriendRequestStatus;
}

export interface FriendRequestResponseDto {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  receiver: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    profileImage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string;
  friendshipDate: Date;
}

export interface FriendRequestStatsDto {
  totalFriends: number;
  pendingReceived: number;
  pendingSent: number;
  friendsThisWeek: number;
  friendsThisMonth: number;
}
