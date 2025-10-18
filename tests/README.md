# Tests Directory

This directory contains all test files for the social app backend.

## Test Files

### Redis Tests
- `test-redis-cleanup.js` - Main test script for Redis cleanup functionality
- `test-redis-cleanup.job.ts` - TypeScript test class for Redis cleanup job

### Socket.IO Tests
- `test-socket-connection.js` - Basic Socket.IO connection testing
- `test-valid-token.js` - Socket.IO authentication testing with valid JWT

## Running Tests

### Redis Cleanup Tests
```bash
# Run the main Redis test script
node tests/test-redis-cleanup.js

# Run TypeScript test directly
npx ts-node tests/test-redis-cleanup.job.ts
```

### Socket.IO Tests
```bash
# Test basic connection
node tests/test-socket-connection.js

# Test with valid token
node tests/test-valid-token.js
```

### All Tests
```bash
# Run all tests
npm run test

# Run specific test category
npm run test:redis
npm run test:socket
```

## Test Structure

```
tests/
├── README.md                    # This file
├── test-redis-cleanup.js        # Main Redis test script
├── test-redis-cleanup.job.ts    # Redis cleanup job test class
├── test-socket-connection.js    # Socket.IO connection test
└── test-valid-token.js          # Socket.IO auth test
```

## Adding New Tests

When adding new test files:

1. Place them in the `tests/` directory
2. Use descriptive names starting with `test-`
3. Update this README with the new test description
4. Add appropriate npm scripts in `package.json`
5. Ensure proper imports if using TypeScript

## Test Dependencies

- `socket.io-client` - For Socket.IO testing
- `ts-node` - For running TypeScript test files
- `redis-cli` - For Redis connection testing (system dependency)
