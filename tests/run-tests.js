#!/usr/bin/env node

/**
 * Test Runner
 * Run tests from the project root to ensure proper path resolution
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Starting Test Runner...\n');

// Test 1: Check if Redis is running
console.log('1️⃣ Testing Redis connection...');
exec('redis-cli ping', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Redis is not running. Please start Redis first:');
    console.error('   brew services start redis  # macOS');
    console.error('   sudo systemctl start redis # Linux');
    console.error('   redis-server               # Manual start');
    process.exit(1);
  }
  
  if (stdout.trim() === 'PONG') {
    console.log('✅ Redis is running');
  } else {
    console.error('❌ Redis connection failed');
    process.exit(1);
  }
});

// Test 2: Run the TypeScript test
console.log('\n2️⃣ Running Redis cleanup job test...');
const testFile = path.join(__dirname, 'test-redis-cleanup.job.ts');

// Change to project root directory for proper path resolution
const projectRoot = path.join(__dirname, '..');
process.chdir(projectRoot);

exec(`node -r tsconfig-paths/register -r ts-node/register tests/test-redis-cleanup.job.ts`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Test failed:', error.message);
    console.error('stderr:', stderr);
    process.exit(1);
  }
  
  console.log('✅ Test completed successfully');
  console.log('stdout:', stdout);
});

// Test 3: Check Redis memory usage
console.log('\n3️⃣ Checking Redis memory usage...');
exec('redis-cli info memory | grep used_memory_human', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Failed to get memory info:', error.message);
    return;
  }
  
  console.log('📊 Redis Memory Usage:', stdout.trim());
});

// Test 4: Check Redis key count
console.log('\n4️⃣ Checking Redis key count...');
exec('redis-cli dbsize', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Failed to get key count:', error.message);
    return;
  }
  
  console.log('🔑 Total Redis Keys:', stdout.trim());
});

console.log('\n🎉 Test runner completed!');
console.log('\n📋 Available test commands:');
console.log('npm run test:redis    # Run Redis tests');
console.log('npm run test:socket   # Run Socket.IO tests');
console.log('npm run test:auth     # Run authentication tests');
console.log('npm run test:ts       # Run TypeScript tests');
console.log('npm test              # Run all tests');
