# Socket.IO Integration Guide

This guide explains the Socket.IO integration in your social app backend, designed to work seamlessly with your React Native chat frontend.

## 🏗️ Architecture Overview

The Socket.IO implementation follows a modular architecture with separation of concerns:

```
src/modules/socket/
├── socket.types.ts           # TypeScript interfaces and types
├── socket.auth.ts            # Authentication service
├── socket.gateway.ts         # Main Socket.IO server setup
├── socket.handlers.ts        # Event handlers
├── socket.message.service.ts # Message handling service
├── socket.routes.ts          # REST API endpoints
└── index.ts                  # Module exports
```

## 🔧 Features

- ✅ **JWT Authentication**: Integrates with your existing auth system
- ✅ **Real-time Messaging**: Private and group chat support
- ✅ **Room Management**: Automatic user and group room handling
- ✅ **Error Handling**: Comprehensive error handling and logging
- ✅ **TypeScript Support**: Fully typed Socket.IO implementation
- ✅ **Modular Design**: Clean separation of concerns
- ✅ **CORS Support**: Configured for cross-origin requests

## 🚀 Getting Started

### 1. Dependencies

The following dependencies have been added:
```bash
npm install socket.io @types/socket.io
```

### 2. Server Integration

The Socket.IO server is automatically initialized in your `bootstrap` function:

```typescript
// src/app.controller.ts
const socketGateway = new SocketGateway(app);
```

### 3. Authentication

Socket connections are authenticated using your existing JWT system:

```typescript
// Client-side connection
const socket = io('http://localhost:3000', {
  auth: {
    authorization: `USER ${token}`
  }
});
```

## 📡 Socket Events

### Client to Server Events

| Event | Description | Data |
|-------|-------------|------|
| `sayHi` | Test connection | `string` |
| `sendMessage` | Send private message | `{ content: string, sendTo: string }` |
| `sendGroupMessage` | Send group message | `{ content: string, groupId: string }` |
| `join_room` | Join a room | `{ roomId: string }` |

### Server to Client Events

| Event | Description | Data |
|-------|-------------|------|
| `connect` | Connection established | - |
| `disconnect` | Connection lost | - |
| `newMessage` | Incoming message | `SocketMessage` |
| `successMessage` | Message sent confirmation | `SocketMessage` |
| `userConnected` | User came online | `{ userId: string, username: string }` |
| `userDisconnected` | User went offline | `{ userId: string, username: string }` |
| `connect_error` | Connection error | `{ message: string }` |
| `custom_error` | Custom error | `{ message: string }` |

## 🔐 Authentication Flow

1. Client connects with JWT token in auth header
2. Server verifies token using existing `verifyToken` utility
3. User document is fetched from database
4. Account status is checked (frozen accounts are rejected)
5. User is attached to socket and joined to personal room

## 🏠 Room Management

### User Rooms
- Format: `user:{userId}`
- Used for private messages and notifications

### Group Rooms
- Format: `group:{groupId}`
- Used for group chat messages

## 📝 Message Format

```typescript
interface SocketMessage {
  _id: string;
  content: string;
  createdBy: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
  createdAt: string;
  sendTo?: string;    // For private messages
  groupId?: string;   // For group messages
}
```

## 🛠️ API Endpoints

### Socket Status
```
GET /api/socket/status
Authorization: USER {token}
```

### Test Connection
```
POST /api/socket/test
Authorization: USER {token}
```

## 🔧 Configuration

### CORS Settings
```typescript
cors: {
  origin: "*", // Configure for your frontend domains
  methods: ["GET", "POST"],
  credentials: true
}
```

### Transport Options
```typescript
transports: ['websocket', 'polling']
```

## 🧪 Testing

### 1. Start the Server
```bash
npm start
```

### 2. Test Socket Connection
```bash
curl -H "Authorization: USER your_jwt_token" \
     http://localhost:3000/api/socket/status
```

### 3. Frontend Integration
Your React Native app should connect automatically using the existing `useSocket` hook.

## 🔍 Debugging

### Server Logs
The server logs all socket events:
- User connections/disconnections
- Message sending/receiving
- Room joining
- Authentication attempts
- Errors

### Client-side Debugging
```javascript
socket.on('connect', () => console.log('Connected'));
socket.on('connect_error', (error) => console.error('Connection error:', error));
socket.on('custom_error', (error) => console.error('Custom error:', error));
```

## 🚨 Error Handling

### Authentication Errors
- Missing token: `Authentication token missing`
- Invalid token: `Invalid or expired token`
- User not found: `User not found`
- Frozen account: `Account is frozen`

### Message Errors
- Missing content: `Content and recipient are required`
- Missing group ID: `Content and group ID are required`
- Room join failure: `Failed to join room`

## 🔄 Integration with Frontend

Your React Native app (`/Users/almalizy/RN/all_in_one_expo`) is already configured to work with this backend:

1. **Server URL**: Update `baseURL` in frontend to match your server
2. **Authentication**: Uses same JWT token format
3. **Events**: All events match frontend expectations
4. **Message Format**: Compatible with existing message structure

## 📈 Scalability Considerations

### Redis Integration (Future)
For horizontal scaling, consider adding Redis adapter:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
// Configure Redis adapter for multiple server instances
```

### Database Integration
Currently messages are handled in-memory. To persist messages:
1. Create a Message model
2. Uncomment database save methods in `SocketMessageService`
3. Add message history endpoints

## 🛡️ Security Best Practices

1. **Token Validation**: All connections require valid JWT
2. **User Verification**: Database lookup for each connection
3. **Account Status**: Frozen accounts are rejected
4. **Room Isolation**: Users can only join authorized rooms
5. **Error Sanitization**: Sensitive errors are not exposed to clients

## 🔧 Customization

### Adding New Events
1. Add event to `ClientToServerEvents` interface
2. Create handler in `SocketHandlers` class
3. Update documentation

### Custom Authentication
Modify `SocketAuthService.authenticateSocket()` for custom auth logic.

### Message Persistence
Implement database storage in `SocketMessageService` save methods.

## 📞 Support

For issues or questions:
1. Check server logs for error details
2. Verify JWT token format and validity
3. Ensure CORS settings match your frontend domain
4. Test with provided API endpoints

The Socket.IO integration is now ready for production use with your React Native chat application! 🎉
