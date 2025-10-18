import { Socket } from 'socket.io';
import { verifyToken } from '@utils/token.utils';
import UserModel from '@db/models/user.model';
import { AuthenticatedSocket } from './socket.types';

export class SocketAuthService {
  static async authenticateSocket(socket: Socket): Promise<AuthenticatedSocket | null> {
    try {
      const token = socket.handshake.auth?.authorization;
      
      if (!token) {
        socket.disconnect(true);
        return null;
      }

      const [bearer, tokenStr] = token.split(' ') || [];
      
      if (!bearer || !tokenStr || bearer !== 'user') {
        socket.disconnect(true);
        return null;
      }

      // Verify token
      let decoded: any;
      try {
        decoded = verifyToken({
          token: tokenStr,
          bearer: 'user'
        });
      } catch (error) {
        socket.disconnect(true);
        return null;
      }

      // Get user from database
      const user = await UserModel.findById(decoded._id);
      if (!user) {
        socket.disconnect(true);
        return null;
      }

      // Check if user account is active (frozen accounts have freezeAt property)
      if (user.freezeAt) {
        socket.disconnect(true);
        return null;
      }

      // Attach user to socket
      const authenticatedSocket = socket as AuthenticatedSocket;
      authenticatedSocket.user = user;
      authenticatedSocket.userId = (user._id as any).toString();

      return authenticatedSocket;
    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.disconnect(true);
      return null;
    }
  }

  static getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  static getGroupRoom(groupId: string): string {
    return `group:${groupId}`;
  }
}
