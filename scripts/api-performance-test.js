#!/usr/bin/env node

/**
 * API Performance Testing Script
 * Tests all endpoints with and without Redis to measure performance impact
 * 
 * Usage:
 * node scripts/api-performance-test.js
 * 
 * Or with npm:
 * npm run test-performance
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_ITERATIONS = 5; // Number of times to test each endpoint
const DELAY_BETWEEN_TESTS = 1000; // 1 second delay between tests

// Test user credentials (you may need to adjust these)
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  firstName: 'Test',
  lastName: 'User'
};

const ADMIN_USER = {
  email: 'admin@example.com', 
  password: 'admin123'
};

// API Endpoints to test
const API_ENDPOINTS = {
  // Authentication endpoints
  auth: [
    { method: 'POST', path: '/auth/signup', requiresAuth: false, body: TEST_USER },
    { method: 'POST', path: '/auth/login', requiresAuth: false, body: { email: TEST_USER.email, password: TEST_USER.password } },
    { method: 'POST', path: '/auth/refresh-token', requiresAuth: true },
    { method: 'POST', path: '/auth/logout', requiresAuth: true }
  ],
  
  // User endpoints
  users: [
    { method: 'GET', path: '/getUsers', requiresAuth: false },
    { method: 'GET', path: '/getSingleUser', requiresAuth: true }
  ],
  
  // Post endpoints
  posts: [
    { method: 'GET', path: '/api/posts', requiresAuth: false },
    { method: 'POST', path: '/api/posts', requiresAuth: true, body: { title: 'Test Post', content: 'Test content' } },
    { method: 'GET', path: '/api/posts/stats/user', requiresAuth: true }
  ],
  
  // Comment endpoints
  comments: [
    { method: 'GET', path: '/api/comments', requiresAuth: false }
  ],
  
  // Friend request endpoints
  friendRequests: [
    { method: 'GET', path: '/api/friend-requests', requiresAuth: true }
  ],
  
  // Health check endpoints
  health: [
    { method: 'GET', path: '/health', requiresAuth: false },
    { method: 'GET', path: '/health/detailed', requiresAuth: false }
  ],
  
  // Redis endpoints
  redis: [
    { method: 'GET', path: '/api/redis/stats', requiresAuth: true },
    { method: 'GET', path: '/api/redis/keys', requiresAuth: true }
  ]
};

class PerformanceTester {
  constructor() {
    this.results = {
      withRedis: {},
      withoutRedis: {},
      summary: {}
    };
    this.authToken = null;
    this.adminToken = null;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, url, options = {}) {
    const startTime = Date.now();
    
    try {
      const config = {
        method: method.toLowerCase(),
        url,
        timeout: 30000,
        ...options
      };

      if (options.requiresAuth && this.authToken) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${this.authToken}`
        };
      }

      const response = await axios(config);
      const endTime = Date.now();
      
      return {
        success: true,
        responseTime: endTime - startTime,
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      };
    } catch (error) {
      const endTime = Date.now();
      
      return {
        success: false,
        responseTime: endTime - startTime,
        status: error.response?.status || 0,
        error: error.message
      };
    }
  }

  async authenticate() {
    console.log('🔐 Authenticating test user...');
    
    try {
      // Try to login first
      const loginResult = await this.makeRequest('POST', `${BASE_URL}/auth/login`, {
        data: { email: TEST_USER.email, password: TEST_USER.password }
      });

      if (loginResult.success) {
        // Parse response to get token (you may need to adjust this based on your response structure)
        console.log('✅ Login successful');
      } else {
        // If login fails, try to signup
        console.log('📝 Login failed, attempting signup...');
        const signupResult = await this.makeRequest('POST', `${BASE_URL}/auth/signup`, {
          data: TEST_USER
        });
        
        if (signupResult.success) {
          console.log('✅ Signup successful');
          // You may need to confirm email here depending on your setup
        }
      }
    } catch (error) {
      console.warn('⚠️ Authentication setup failed:', error.message);
    }
  }

  async testEndpoint(method, path, options = {}, redisEnabled = true) {
    const url = `${BASE_URL}${path}`;
    const testName = `${method} ${path}`;
    
    console.log(`  Testing: ${testName} (Redis: ${redisEnabled ? 'ON' : 'OFF'})`);
    
    const times = [];
    let successCount = 0;
    
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const result = await this.makeRequest(method, url, {
        data: options.body,
        requiresAuth: options.requiresAuth
      });
      
      times.push(result.responseTime);
      if (result.success) successCount++;
      
      // Small delay between iterations
      await this.delay(200);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      endpoint: testName,
      avgTime: Math.round(avgTime),
      minTime,
      maxTime,
      successRate: (successCount / TEST_ITERATIONS) * 100,
      iterations: TEST_ITERATIONS,
      allTimes: times
    };
  }

  async toggleRedis(enable) {
    console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} Redis...`);
    
    try {
      // Try to toggle Redis via API endpoint
      await this.makeRequest('POST', `${BASE_URL}/api/redis/${enable ? 'enable' : 'disable'}`, {
        requiresAuth: true
      });
    } catch (error) {
      console.warn(`⚠️ Could not toggle Redis via API: ${error.message}`);
      console.log('💡 You may need to manually restart the server with DISABLE_REDIS=true environment variable');
    }
    
    // Wait for changes to take effect
    await this.delay(2000);
  }

  async runTests() {
    console.log('🚀 Starting API Performance Tests...\n');
    
    // Setup authentication
    await this.authenticate();
    await this.delay(1000);
    
    // Test with Redis enabled
    console.log('📊 Testing with Redis ENABLED...');
    for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
      console.log(`\n🔍 Testing ${category} endpoints:`);
      this.results.withRedis[category] = [];
      
      for (const endpoint of endpoints) {
        try {
          const result = await this.testEndpoint(
            endpoint.method, 
            endpoint.path, 
            endpoint, 
            true
          );
          this.results.withRedis[category].push(result);
          
          console.log(`    ✅ ${result.endpoint}: ${result.avgTime}ms avg (${result.successRate}% success)`);
        } catch (error) {
          console.log(`    ❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
        }
        
        await this.delay(DELAY_BETWEEN_TESTS);
      }
    }
    
    console.log('\n⏳ Waiting before Redis toggle...');
    await this.delay(3000);
    
    // Toggle Redis off
    await this.toggleRedis(false);
    
    // Test with Redis disabled
    console.log('\n📊 Testing with Redis DISABLED...');
    for (const [category, endpoints] of Object.entries(API_ENDPOINTS)) {
      console.log(`\n🔍 Testing ${category} endpoints:`);
      this.results.withoutRedis[category] = [];
      
      for (const endpoint of endpoints) {
        try {
          const result = await this.testEndpoint(
            endpoint.method, 
            endpoint.path, 
            endpoint, 
            false
          );
          this.results.withoutRedis[category].push(result);
          
          console.log(`    ✅ ${result.endpoint}: ${result.avgTime}ms avg (${result.successRate}% success)`);
        } catch (error) {
          console.log(`    ❌ ${endpoint.method} ${endpoint.path}: ${error.message}`);
        }
        
        await this.delay(DELAY_BETWEEN_TESTS);
      }
    }
    
    // Re-enable Redis
    await this.toggleRedis(true);
  }

  generateReport() {
    console.log('\n📈 Generating Performance Report...\n');
    
    const report = {
      testDate: new Date().toISOString(),
      configuration: {
        baseUrl: BASE_URL,
        iterations: TEST_ITERATIONS,
        delayBetweenTests: DELAY_BETWEEN_TESTS
      },
      results: this.results,
      summary: this.calculateSummary()
    };
    
    // Save detailed report to file
    const reportPath = path.join(__dirname, '..', 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Display summary
    this.displaySummary();
    
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  calculateSummary() {
    const summary = {
      categories: {},
      overall: {
        withRedis: { avgTime: 0, totalEndpoints: 0 },
        withoutRedis: { avgTime: 0, totalEndpoints: 0 },
        improvement: { avgTime: 0, percentage: 0 }
      }
    };
    
    let totalWithRedis = 0, totalWithoutRedis = 0, totalEndpoints = 0;
    
    for (const category of Object.keys(API_ENDPOINTS)) {
      const withRedis = this.results.withRedis[category] || [];
      const withoutRedis = this.results.withoutRedis[category] || [];
      
      const avgWithRedis = withRedis.length > 0 
        ? withRedis.reduce((sum, r) => sum + r.avgTime, 0) / withRedis.length 
        : 0;
      
      const avgWithoutRedis = withoutRedis.length > 0 
        ? withoutRedis.reduce((sum, r) => sum + r.avgTime, 0) / withoutRedis.length 
        : 0;
      
      const improvement = avgWithoutRedis - avgWithRedis;
      const improvementPercentage = avgWithoutRedis > 0 
        ? (improvement / avgWithoutRedis) * 100 
        : 0;
      
      summary.categories[category] = {
        withRedis: Math.round(avgWithRedis),
        withoutRedis: Math.round(avgWithoutRedis),
        improvement: Math.round(improvement),
        improvementPercentage: Math.round(improvementPercentage * 100) / 100
      };
      
      totalWithRedis += avgWithRedis * withRedis.length;
      totalWithoutRedis += avgWithoutRedis * withoutRedis.length;
      totalEndpoints += Math.max(withRedis.length, withoutRedis.length);
    }
    
    if (totalEndpoints > 0) {
      summary.overall.withRedis.avgTime = Math.round(totalWithRedis / totalEndpoints);
      summary.overall.withoutRedis.avgTime = Math.round(totalWithoutRedis / totalEndpoints);
      summary.overall.improvement.avgTime = summary.overall.withoutRedis.avgTime - summary.overall.withRedis.avgTime;
      summary.overall.improvement.percentage = summary.overall.withoutRedis.avgTime > 0 
        ? Math.round(((summary.overall.improvement.avgTime / summary.overall.withoutRedis.avgTime) * 100) * 100) / 100
        : 0;
    }
    
    return summary;
  }

  displaySummary() {
    const summary = this.calculateSummary();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('                    PERFORMANCE SUMMARY                     ');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log('\n📊 Results by Category:');
    console.log('┌─────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ Category        │ With Redis  │ Without     │ Improvement │ % Faster    │');
    console.log('│                 │ (ms)        │ Redis (ms)  │ (ms)        │             │');
    console.log('├─────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');
    
    for (const [category, data] of Object.entries(summary.categories)) {
      const categoryName = category.padEnd(15);
      const withRedis = data.withRedis.toString().padStart(11);
      const withoutRedis = data.withoutRedis.toString().padStart(11);
      const improvement = data.improvement.toString().padStart(11);
      const percentage = `${data.improvementPercentage}%`.padStart(11);
      
      console.log(`│ ${categoryName} │ ${withRedis} │ ${withoutRedis} │ ${improvement} │ ${percentage} │`);
    }
    
    console.log('└─────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');
    
    console.log('\n🎯 Overall Performance:');
    console.log(`   With Redis:    ${summary.overall.withRedis.avgTime}ms average`);
    console.log(`   Without Redis: ${summary.overall.withoutRedis.avgTime}ms average`);
    console.log(`   Improvement:   ${summary.overall.improvement.avgTime}ms (${summary.overall.improvement.percentage}% faster)`);
    
    if (summary.overall.improvement.percentage > 0) {
      console.log('\n✅ Redis is providing significant performance benefits!');
    } else if (summary.overall.improvement.percentage < -5) {
      console.log('\n⚠️ Redis might be adding overhead - check configuration');
    } else {
      console.log('\n📊 Redis impact is minimal - consider optimizing cache strategy');
    }
  }
}

// Main execution
async function main() {
  const tester = new PerformanceTester();
  
  try {
    await tester.runTests();
    tester.generateReport();
    
    console.log('\n🎉 Performance testing completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Performance testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PerformanceTester };
