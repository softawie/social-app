import { Server } from 'socket.io';
import { createServer } from 'http';
import { Express } from 'express';
import { SocketHandlers } from './socket.handlers';
import { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData 
} from './socket.types';

export class SocketGateway {
  private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private handlers: SocketHandlers;

  constructor(app: Express) {
    // Create HTTP server
    const server = createServer(app);

    // Initialize Socket.IO
    this.io = new Server(server, {
      cors: {
        origin: "*", // Configure this based on your frontend domains
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });

    // Initialize handlers
    this.handlers = new SocketHandlers(this.io);

    // Setup connection handling
    this.setupConnectionHandling();

    // Store server reference for app to use
    (app as any).httpServer = server;
  }

  private setupConnectionHandling() {
    this.io.on('connection', this.handlers.handleConnection);

    console.log('Socket.IO gateway initialized');
  }

  // Get the Socket.IO server instance
  getIO(): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    return this.io;
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Broadcast to all connected clients
  broadcast(event: keyof ServerToClientEvents, data: any) {
    this.io.emit(event as any, data);
  }

  // Send to specific room
  toRoom(room: string, event: keyof ServerToClientEvents, data: any) {
    this.io.to(room).emit(event as any, data);
  }

  // Graceful shutdown
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('Socket.IO server closed');
        resolve();
      });
    });
  }
}
