#!/usr/bin/env node

/**
 * Test Redis Cache Cleanup Job
 * Run this script to test the RedisCacheCleanupJob functionality
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🧪 Starting Redis Cache Cleanup Job Test...\n');

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

// Test 2: Run the cleanup job test
console.log('\n2️⃣ Running Redis cleanup job test...');
const testFile = path.join(__dirname, 'test-redis-cleanup.job.ts');

exec(`npx ts-node ${testFile}`, (error, stdout, stderr) => {
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

console.log('\n🎉 Redis cleanup job test completed!');
console.log('\n📋 Next steps:');
console.log('1. Review the REDIS_AUDIT_REPORT.md for issues found');
console.log('2. Fix the security issues in auth service');
console.log('3. Implement proper TTLs for all cached data');
console.log('4. Replace KEYS with SCAN for better performance');
console.log('5. Add memory management configuration');
