# Social App Backend

A comprehensive Node.js/TypeScript backend for a social media application with Redis caching, Socket.IO real-time features, and MongoDB database.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

## 📁 Project Structure

```
social app/
├── src/                    # Source code
│   ├── db/                # Database models and connections
│   ├── modules/           # Feature modules (auth, posts, etc.)
│   ├── MiddleWares/       # Express middlewares
│   ├── utils/             # Utility functions
│   ├── jobs/              # Background jobs and cron tasks
│   └── types/             # TypeScript type definitions
├── tests/                 # Test files
│   ├── test-redis-cleanup.js
│   ├── test-socket-connection.js
│   └── test-valid-token.js
├── docs/                  # Documentation
│   ├── REDIS_INTEGRATION_GUIDE.md
│   ├── SOCKET_IO_INTEGRATION_GUIDE.md
│   └── ...
├── scripts/               # Utility scripts
└── dist/                  # Compiled JavaScript (generated)
```

## 🛠️ Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server

### Testing
- `npm test` - Run all tests
- `npm run test:redis` - Run Redis tests
- `npm run test:socket` - Run Socket.IO tests
- `npm run test:auth` - Run authentication tests
- `npm run test:ts` - Run TypeScript tests

### Database
- `npm run create-indexes` - Create database indexes
- `npm run db:indexes` - Alias for create-indexes

## 🔧 Features

### Core Features
- **Authentication** - JWT-based auth with Redis session management
- **Posts** - Create, read, update, delete posts with caching
- **Comments** - Nested comment system with real-time updates
- **Friend Requests** - Social networking features
- **File Uploads** - Image and file handling with Multer

### Technical Features
- **Redis Caching** - High-performance caching with cleanup jobs
- **Socket.IO** - Real-time communication
- **Rate Limiting** - Redis-based rate limiting
- **Background Jobs** - Automated cleanup and maintenance
- **Logging** - Comprehensive logging system
- **Backup System** - Automated database backups

## 📚 Documentation

All documentation is organized in the `docs/` directory:

- [Redis Integration Guide](docs/REDIS_INTEGRATION_GUIDE.md)
- [Socket.IO Integration Guide](docs/SOCKET_IO_INTEGRATION_GUIDE.md)
- [Universal Cache Usage](docs/UNIVERSAL_CACHE_USAGE.md)
- [Database Optimization](docs/database-optimization.md)
- [Backup System Guide](docs/BACKUP_SYSTEM_GUIDE.md)

## 🧪 Testing

Tests are organized in the `tests/` directory:

- **Redis Tests** - Cache cleanup and performance testing
- **Socket.IO Tests** - Real-time communication testing
- **Authentication Tests** - JWT token validation testing

Run tests with:
```bash
npm test                    # All tests
npm run test:redis         # Redis tests only
npm run test:socket        # Socket.IO tests only
```

## 🔐 Environment Variables

Create a `.env` file with:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/socialapp
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Server
PORT=3000
NODE_ENV=development
```

## 🚀 Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

3. **Set up Redis and MongoDB** on your server

4. **Configure environment variables** for production

## 📊 Monitoring

- **Redis Monitoring** - Built-in Redis health checks and metrics
- **Logging** - Structured logging with different levels
- **Performance** - Cache hit rates and response time monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.
