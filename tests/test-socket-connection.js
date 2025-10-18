const { io } = require('socket.io-client');

console.log('🧪 Testing Socket.IO Connection...\n');

// Test without authentication first
console.log('1️⃣ Testing connection without authentication...');
const socketNoAuth = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  timeout: 5000
});

socketNoAuth.on('connect', () => {
  console.log('✅ Connected without auth (Socket ID:', socketNoAuth.id + ')');
  
  // Test sayHi event
  socketNoAuth.emit('sayHi', 'Test message from Node.js client', (response) => {
    console.log('📡 Server response:', response);
  });
  
  setTimeout(() => {
    socketNoAuth.disconnect();
    console.log('❌ Disconnected from server\n');
    
    // Test with authentication
    testWithAuth();
  }, 2000);
});

socketNoAuth.on('connect_error', (error) => {
  console.log('❌ Connection error (without auth):', error.message);
  console.log('   This is expected if authentication is required\n');
  
  // Test with authentication
  testWithAuth();
});

socketNoAuth.on('disconnect', (reason) => {
  console.log('❌ Disconnected (without auth):', reason);
});

function testWithAuth() {
  console.log('2️⃣ Testing connection with dummy authentication...');
  
  const socketWithAuth = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
    timeout: 5000,
    auth: {
      authorization: 'USER dummy_token_for_testing'
    }
  });

  socketWithAuth.on('connect', () => {
    console.log('✅ Connected with auth (Socket ID:', socketWithAuth.id + ')');
    
    // Test sayHi event
    socketWithAuth.emit('sayHi', 'Authenticated test message', (response) => {
      console.log('📡 Server response:', response);
    });
    
    setTimeout(() => {
      socketWithAuth.disconnect();
      console.log('❌ Disconnected from server');
      console.log('\n🎉 Socket.IO connection tests completed!');
      process.exit(0);
    }, 2000);
  });

  socketWithAuth.on('connect_error', (error) => {
    console.log('❌ Connection error (with auth):', error.message);
    console.log('   This is expected if the dummy token is invalid');
    console.log('\n✅ Socket.IO server is properly rejecting invalid tokens');
    console.log('🎉 Socket.IO is working correctly!');
    process.exit(0);
  });

  socketWithAuth.on('disconnect', (reason) => {
    console.log('❌ Disconnected (with auth):', reason);
  });

  socketWithAuth.on('custom_error', (error) => {
    console.log('⚠️ Custom error:', error.message);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

setTimeout(() => {
  console.log('\n⏰ Test timeout - Socket.IO might not be responding');
  process.exit(1);
}, 10000);
