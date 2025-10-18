const { io } = require('socket.io-client');

console.log('🧪 Testing Socket.IO with Valid JWT Token...\n');

const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM4NzY2OTZjYzM0YmI3NGQxZGFkNzkiLCJpYXQiOjE3NjA3NDE0ODMsImV4cCI6MTc2MDgyNzg4MywiaXNzIjoibXlBcHAiLCJzdWIiOiJhY2Nlc3MiLCJqdGkiOiJ6MVZWN0UxUUpPdmVfVkZIYzVYbzQifQ.vYnUx_WTUIFQIqPJdRFB15K3BQFf58N7LEnp8fOviLM';

console.log('Token:', validToken);
console.log('Connecting to: http://localhost:3000');
console.log('Auth header: USER ' + validToken.substring(0, 20) + '...\n');

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  timeout: 10000,
  auth: {
    authorization: `USER ${validToken}`
  },
  forceNew: true
});

let connectionAttempted = false;

socket.on('connect', () => {
  connectionAttempted = true;
  console.log('✅ SUCCESS! Connected to Socket.IO server');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  
  // Test sayHi event
  console.log('\n📡 Testing sayHi event...');
  socket.emit('sayHi', 'Hello from authenticated client!', (response) => {
    console.log('✅ Server response received:');
    console.log(JSON.stringify(response, null, 2));
  });
  
  // Test private message
  setTimeout(() => {
    console.log('\n📨 Testing private message...');
    socket.emit('sendMessage', {
      content: 'Test private message',
      sendTo: '68c876696cc34bb74d1dad79' // Using the same user ID from token
    });
  }, 1000);
  
  // Disconnect after tests
  setTimeout(() => {
    console.log('\n👋 Disconnecting...');
    socket.disconnect();
    console.log('🎉 All tests completed successfully!');
    process.exit(0);
  }, 3000);
});

socket.on('connect_error', (error) => {
  connectionAttempted = true;
  console.log('❌ Connection Error:', error.message);
  console.log('   Error type:', error.type);
  console.log('   Error description:', error.description);
  
  if (error.message.includes('websocket error')) {
    console.log('\n🔍 Debugging websocket error:');
    console.log('   - Check if Socket.IO server is properly initialized');
    console.log('   - Verify HTTP server is using the correct instance');
    console.log('   - Check CORS configuration');
  }
  
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('newMessage', (message) => {
  console.log('📨 Received message:', message);
});

socket.on('successMessage', (message) => {
  console.log('✅ Message sent successfully:', message);
});

socket.on('custom_error', (error) => {
  console.log('⚠️ Custom error:', error.message);
});

// Timeout after 15 seconds
setTimeout(() => {
  if (!connectionAttempted) {
    console.log('⏰ Connection timeout - no response from server');
    console.log('   This might indicate the Socket.IO server is not running properly');
  }
  process.exit(1);
}, 15000);

console.log('⏳ Attempting connection...');
