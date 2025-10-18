import { Socket } from 'socket.io';
import { IUser } from '@db/models/user.model';
import { Document } from 'mongoose';

export interface AuthenticatedSocket extends Socket {
  user?: Document<unknown, {}, IUser> & IUser & { _id: unknown };
  userId?: string;
}

export interface SocketMessage {
  _id?: string;
  content: string;
  createdBy: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  createdAt: string;
  sendTo?: string;
  groupId?: string;
}

export interface ChatMessage {
  content: string;
  sendTo?: string;
  groupId?: string;
}

export interface JoinRoomData {
  roomId: string;
}

export interface ServerToClientEvents {
  newMessage: (message: SocketMessage) => void;
  successMessage: (message: SocketMessage) => void;
  userConnected: (data: { userId: string; username: string }) => void;
  userDisconnected: (data: { userId: string; username: string }) => void;
  connect_error: (error: { message: string }) => void;
  custom_error: (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  sayHi: (message: string, callback?: (response: any) => void) => void;
  sendMessage: (data: ChatMessage) => void;
  sendGroupMessage: (data: ChatMessage) => void;
  join_room: (data: JoinRoomData) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  user?: IUser & { _id: string };
  userId?: string;
}

// Helper function to get user display name
export const getUserDisplayName = (user: Document<unknown, {}, IUser> & IUser & { _id: unknown }): string => {
  return `${user.firstName} ${user.lastName}`.trim();
};

// Helper function to get user profile picture
export const getUserProfilePicture = (user: Document<unknown, {}, IUser> & IUser & { _id: unknown }): string | undefined => {
  return user.profileImage;
};
