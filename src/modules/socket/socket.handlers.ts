import { Server } from 'socket.io';
import { AuthenticatedSocket, ChatMessage, JoinRoomData, SocketMessage, getUserDisplayName } from './socket.types';
import { SocketAuthService } from './socket.auth';
import { SocketMessageService } from './socket.message.service';

export class SocketHandlers {
  private io: Server;
  private messageService: SocketMessageService;

  constructor(io: Server) {
    this.io = io;
    this.messageService = new SocketMessageService(io);
  }

  handleConnection = async (socket: AuthenticatedSocket) => {
    console.log(`Socket connection attempt: ${socket.id}`);

    // Authenticate socket
    const authenticatedSocket = await SocketAuthService.authenticateSocket(socket);
    if (!authenticatedSocket || !authenticatedSocket.user) {
      socket.disconnect();
      return;
    }

    const user = authenticatedSocket.user;
    const userId = (user._id as any).toString();
    
    console.log(`User ${getUserDisplayName(user)} connected with socket ${socket.id}`);

    // Join user's personal room
    const userRoom = SocketAuthService.getUserRoom(userId);
    await socket.join(userRoom);

    // Notify other users about connection
    socket.broadcast.emit('userConnected', {
      userId,
      username: getUserDisplayName(user)
    });

    // Handle sayHi event
    socket.on('sayHi', (message: string, callback?: (response: any) => void) => {
      console.log(`sayHi from ${getUserDisplayName(user)}: ${message}`);
      const response = {
        message: `Hello ${getUserDisplayName(user)}! Server received: ${message}`,
        timestamp: new Date().toISOString(),
        user: {
          id: userId,
          username: getUserDisplayName(user)
        }
      };
      
      if (callback) {
        callback(response);
      }
    });

    // Handle private messages
    socket.on('sendMessage', async (data: ChatMessage) => {
      await this.messageService.handlePrivateMessage(authenticatedSocket, data);
    });

    // Handle group messages
    socket.on('sendGroupMessage', async (data: ChatMessage) => {
      await this.messageService.handleGroupMessage(authenticatedSocket, data);
    });

    // Handle room joining
    socket.on('join_room', async (data: JoinRoomData) => {
      await this.handleJoinRoom(authenticatedSocket, data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${getUserDisplayName(user)} disconnected`);
      socket.broadcast.emit('userDisconnected', {
        userId,
        username: getUserDisplayName(user)
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${getUserDisplayName(user)}:`, error);
      socket.emit('custom_error', { message: 'An error occurred' });
    });
  };

  private handleJoinRoom = async (socket: AuthenticatedSocket, data: JoinRoomData) => {
    try {
      const { roomId } = data;
      
      if (!roomId) {
        socket.emit('custom_error', { message: 'Room ID is required' });
        return;
      }

      // Join the room
      await socket.join(roomId);
      console.log(`User ${socket.user ? getUserDisplayName(socket.user) : 'Unknown'} joined room: ${roomId}`);

      // Optionally notify other users in the room
      socket.to(roomId).emit('userConnected', {
        userId: socket.userId!,
        username: socket.user ? getUserDisplayName(socket.user) : 'Unknown'
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('custom_error', { message: 'Failed to join room' });
    }
  };
}
