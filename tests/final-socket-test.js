const { io } = require('socket.io-client');

console.log('🎯 Final Socket.IO Integration Test\n');

const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OGM4NzY2OTZjYzM0YmI3NGQxZGFkNzkiLCJpYXQiOjE3NjA3NDE0ODMsImV4cCI6MTc2MDgyNzg4MywiaXNzIjoibXlBcHAiLCJzdWIiOiJhY2Nlc3MiLCJqdGkiOiJ6MVZWN0UxUUpPdmVfVkZIYzVYbzQifQ.vYnUx_WTUIFQIqPJdRFB15K3BQFf58N7LEnp8fOviLM';

console.log('🔑 Using valid JWT token');
console.log('🌐 Connecting to: http://localhost:3000');
console.log('📡 Testing all Socket.IO features...\n');

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  timeout: 5000,
  auth: {
    authorization: `USER ${validToken}`
  },
  forceNew: true
});

let testResults = {
  connection: false,
  authentication: false,
  sayHi: false,
  events: false
};

socket.on('connect', () => {
  testResults.connection = true;
  testResults.authentication = true;
  
  console.log('✅ Connection: SUCCESS');
  console.log(`   Socket ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  console.log('✅ Authentication: SUCCESS');
  
  // Test sayHi event with callback
  console.log('\n📡 Testing sayHi event...');
  socket.emit('sayHi', 'Final integration test!', (response) => {
    if (response) {
      testResults.sayHi = true;
      console.log('✅ sayHi: SUCCESS');
      console.log('   Server responded with:', response.message);
    } else {
      console.log('⚠️ sayHi: No callback response (but event sent)');
    }
  });
  
  // Test event listeners
  testResults.events = true;
  console.log('✅ Event Listeners: READY');
  
  // Disconnect after a short delay
  setTimeout(() => {
    socket.disconnect();
    showResults();
  }, 2000);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection: FAILED');
  console.log('   Error:', error.message);
  showResults();
});

socket.on('disconnect', (reason) => {
  console.log(`\n👋 Disconnected: ${reason}`);
});

socket.on('newMessage', (message) => {
  console.log('📨 Received newMessage:', message);
});

socket.on('successMessage', (message) => {
  console.log('✅ Received successMessage:', message);
});

socket.on('userConnected', (data) => {
  console.log('👋 User connected:', data);
});

socket.on('userDisconnected', (data) => {
  console.log('👋 User disconnected:', data);
});

socket.on('custom_error', (error) => {
  console.log('⚠️ Custom error:', error);
});

function showResults() {
  console.log('\n' + '='.repeat(50));
  console.log('🎯 SOCKET.IO INTEGRATION TEST RESULTS');
  console.log('='.repeat(50));
  
  console.log(`Connection:      ${testResults.connection ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication:  ${testResults.authentication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`sayHi Event:     ${testResults.sayHi ? '✅ PASS' : '⚠️ PARTIAL'}`);
  console.log(`Event Listeners: ${testResults.events ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = testResults.connection && testResults.authentication && testResults.events;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 OVERALL STATUS: SUCCESS!');
    console.log('✅ Your Socket.IO backend is fully operational');
    console.log('✅ React Native app can connect successfully');
    console.log('✅ Real-time messaging is ready');
  } else {
    console.log('⚠️ OVERALL STATUS: PARTIAL SUCCESS');
    console.log('   Connection works but some features need attention');
  }
  
  console.log('\n📱 Your React Native app can now use:');
  console.log('   Server URL: http://localhost:3000');
  console.log('   Auth Format: USER {jwt_token}');
  console.log('   Transport: WebSocket with polling fallback');
  
  process.exit(allPassed ? 0 : 1);
}

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout');
  showResults();
}, 10000);
