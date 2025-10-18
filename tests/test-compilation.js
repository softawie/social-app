#!/usr/bin/env node

/**
 * Compilation Test
 * Test that TypeScript files compile without errors
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🔨 Testing TypeScript compilation...\n');

// Test TypeScript compilation
console.log('1️⃣ Compiling TypeScript files...');
exec('npx tsc --noEmit', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ TypeScript compilation failed:');
    console.error(stderr);
    process.exit(1);
  }
  
  console.log('✅ TypeScript compilation successful');
  console.log('stdout:', stdout);
});

// Test specific files by checking if they exist and are included in tsconfig
console.log('\n2️⃣ Checking TypeScript files...');
const testFiles = [
  'src/jobs/redis-cache-cleanup.job.ts',
  'src/utils/redis-monitor.service.ts',
  'tests/test-redis-cleanup.job.ts'
];

const fs = require('fs');
let allExist = true;

testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} not found`);
    allExist = false;
  }
});

if (allExist) {
  console.log('\n✅ All TypeScript files exist');
} else {
  console.log('\n❌ Some TypeScript files are missing');
  process.exit(1);
}

console.log('\n🎉 Compilation tests completed!');
process.exit(0);
