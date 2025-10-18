import { Server } from 'socket.io';
import { AuthenticatedSocket, ChatMessage, SocketMessage, getUserDisplayName, getUserProfilePicture } from './socket.types';
import { SocketAuthService } from './socket.auth';
import { nanoid } from 'nanoid';

export class SocketMessageService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async handlePrivateMessage(socket: AuthenticatedSocket, data: ChatMessage) {
    try {
      const { content, sendTo } = data;
      const sender = socket.user!;

      if (!content || !sendTo) {
        socket.emit('custom_error', { message: 'Content and recipient are required' });
        return;
      }

      // Create message object
      const message: SocketMessage = {
        _id: nanoid(),
        content,
        createdBy: {
          _id: (sender._id as any).toString(),
          username: getUserDisplayName(sender),
          profilePicture: getUserProfilePicture(sender)
        },
        createdAt: new Date().toISOString(),
        sendTo
      };

      // Send to recipient
      const recipientRoom = SocketAuthService.getUserRoom(sendTo);
      this.io.to(recipientRoom).emit('newMessage', message);

      // Send confirmation to sender
      socket.emit('successMessage', message);

      console.log(`Private message from ${getUserDisplayName(sender)} to ${sendTo}: ${content}`);

      // TODO: Save message to database if needed
      // await this.saveMessageToDatabase(message);

    } catch (error) {
      console.error('Error handling private message:', error);
      socket.emit('custom_error', { message: 'Failed to send message' });
    }
  }

  async handleGroupMessage(socket: AuthenticatedSocket, data: ChatMessage) {
    try {
      const { content, groupId } = data;
      const sender = socket.user!;

      if (!content || !groupId) {
        socket.emit('custom_error', { message: 'Content and group ID are required' });
        return;
      }

      // Create message object
      const message: SocketMessage = {
        _id: nanoid(),
        content,
        createdBy: {
          _id: (sender._id as any).toString(),
          username: getUserDisplayName(sender),
          profilePicture: getUserProfilePicture(sender)
        },
        createdAt: new Date().toISOString(),
        groupId
      };

      // Send to all users in the group room
      const groupRoom = SocketAuthService.getGroupRoom(groupId);
      this.io.to(groupRoom).emit('newMessage', message);

      // Send confirmation to sender
      socket.emit('successMessage', message);

      console.log(`Group message from ${getUserDisplayName(sender)} to group ${groupId}: ${content}`);

      // TODO: Save message to database if needed
      // await this.saveMessageToDatabase(message);

    } catch (error) {
      console.error('Error handling group message:', error);
      socket.emit('custom_error', { message: 'Failed to send group message' });
    }
  }

  // TODO: Implement database storage
  // private async saveMessageToDatabase(message: SocketMessage) {
  //   // Implementation depends on your message model
  //   // Example:
  //   // await MessageModel.create(message);
  // }

  // Utility method to send message to specific user
  async sendMessageToUser(userId: string, event: string, data: any) {
    const userRoom = SocketAuthService.getUserRoom(userId);
    this.io.to(userRoom).emit(event, data);
  }

  // Utility method to send message to specific group
  async sendMessageToGroup(groupId: string, event: string, data: any) {
    const groupRoom = SocketAuthService.getGroupRoom(groupId);
    this.io.to(groupRoom).emit(event, data);
  }

  // Get connected users count
  getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get users in a specific room
  async getUsersInRoom(roomId: string): Promise<string[]> {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    return room ? Array.from(room) : [];
  }
}
