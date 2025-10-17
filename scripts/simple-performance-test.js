#!/usr/bin/env node

/**
 * Simple API Performance Testing Script
 * Tests key endpoints with and without Redis to measure performance impact
 * 
 * Usage: node scripts/simple-performance-test.js
 */

const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_ITERATIONS = 3;

// Test configuration
const TEST_ENDPOINTS = [
  // Public endpoints (no auth required)
  { method: 'GET', path: '/health', name: 'Health Check', auth: false },
  { method: 'GET', path: '/getUsers', name: 'Get Users (Public)', auth: false },
  { method: 'GET', path: '/api/posts', name: 'Get Posts (Public)', auth: false },
  
  // Auth endpoints
  { method: 'POST', path: '/auth/login', name: 'Login', auth: false, 
    body: { email: 'test@example.com', password: 'password123' } },
];

class SimplePerformanceTester {
  constructor() {
    this.results = [];
    this.authToken = null;
  }

  async makeRequest(endpoint) {
    const url = `${BASE_URL}${endpoint.path}`;
    const startTime = Date.now();
    
    try {
      const config = {
        method: endpoint.method.toLowerCase(),
        url,
        timeout: 10000,
        validateStatus: () => true // Accept any status code
      };

      if (endpoint.body) {
        config.data = endpoint.body;
      }

      if (endpoint.auth && this.authToken) {
        config.headers = {
          'Authorization': `Bearer ${this.authToken}`
        };
      }

      const response = await axios(config);
      const endTime = Date.now();
      
      return {
        success: response.status < 400,
        responseTime: endTime - startTime,
        status: response.status,
        endpoint: endpoint.name
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        responseTime: endTime - startTime,
        status: error.response?.status || 0,
        endpoint: endpoint.name,
        error: error.message
      };
    }
  }

  async testEndpoint(endpoint, redisEnabled) {
    console.log(`  Testing: ${endpoint.name} (Redis: ${redisEnabled ? 'ON' : 'OFF'})`);
    
    const times = [];
    let successCount = 0;
    
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const result = await this.makeRequest(endpoint);
      times.push(result.responseTime);
      if (result.success) successCount++;
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return {
      endpoint: endpoint.name,
      avgTime,
      minTime,
      maxTime,
      successRate: Math.round((successCount / TEST_ITERATIONS) * 100),
      redisEnabled
    };
  }

  async toggleRedis(enable) {
    try {
      console.log(`🔄 ${enable ? 'Enabling' : 'Disabling'} Redis...`);
      
      const response = await axios.post(`${BASE_URL}/api/redis/toggle`, 
        { enable }, 
        { 
          timeout: 5000,
          validateStatus: () => true,
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {}
        }
      );
      
      if (response.status === 200) {
        console.log(`✅ Redis ${enable ? 'enabled' : 'disabled'} successfully`);
      } else {
        console.log(`⚠️ Redis toggle response: ${response.status}`);
      }
      
      // Wait for changes to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`⚠️ Could not toggle Redis: ${error.message}`);
      console.log('💡 Continuing with manual testing - you may need to restart server with DISABLE_REDIS=true');
    }
  }

  async runTests() {
    console.log('🚀 Starting Simple API Performance Tests...\n');
    console.log(`📍 Testing against: ${BASE_URL}`);
    console.log(`🔄 Iterations per test: ${TEST_ITERATIONS}\n`);

    // Test with Redis enabled
    console.log('📊 Testing with Redis ENABLED...');
    for (const endpoint of TEST_ENDPOINTS) {
      try {
        const result = await this.testEndpoint(endpoint, true);
        this.results.push(result);
        console.log(`    ✅ ${result.endpoint}: ${result.avgTime}ms avg (${result.successRate}% success)`);
      } catch (error) {
        console.log(`    ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    console.log('\n⏳ Switching to Redis disabled mode...');
    await this.toggleRedis(false);

    // Test with Redis disabled
    console.log('\n📊 Testing with Redis DISABLED...');
    for (const endpoint of TEST_ENDPOINTS) {
      try {
        const result = await this.testEndpoint(endpoint, false);
        this.results.push(result);
        console.log(`    ✅ ${result.endpoint}: ${result.avgTime}ms avg (${result.successRate}% success)`);
      } catch (error) {
        console.log(`    ❌ ${endpoint.name}: ${error.message}`);
      }
    }

    // Re-enable Redis
    console.log('\n🔄 Re-enabling Redis...');
    await this.toggleRedis(true);
  }

  generateReport() {
    console.log('\n📈 PERFORMANCE COMPARISON REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Group results by endpoint
    const grouped = {};
    this.results.forEach(result => {
      if (!grouped[result.endpoint]) {
        grouped[result.endpoint] = {};
      }
      grouped[result.endpoint][result.redisEnabled ? 'withRedis' : 'withoutRedis'] = result;
    });

    console.log('┌─────────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐');
    console.log('│ Endpoint                │ With Redis  │ Without     │ Difference  │ % Change    │');
    console.log('│                         │ (ms)        │ Redis (ms)  │ (ms)        │             │');
    console.log('├─────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤');

    let totalWithRedis = 0;
    let totalWithoutRedis = 0;
    let validComparisons = 0;

    for (const [endpoint, data] of Object.entries(grouped)) {
      const withRedis = data.withRedis?.avgTime || 0;
      const withoutRedis = data.withoutRedis?.avgTime || 0;
      
      if (withRedis > 0 && withoutRedis > 0) {
        const difference = withoutRedis - withRedis;
        const percentChange = ((difference / withoutRedis) * 100).toFixed(1);
        
        const endpointName = endpoint.substring(0, 23).padEnd(23);
        const withRedisStr = withRedis.toString().padStart(11);
        const withoutRedisStr = withoutRedis.toString().padStart(11);
        const differenceStr = difference.toString().padStart(11);
        const percentStr = `${percentChange}%`.padStart(11);
        
        console.log(`│ ${endpointName} │ ${withRedisStr} │ ${withoutRedisStr} │ ${differenceStr} │ ${percentStr} │`);
        
        totalWithRedis += withRedis;
        totalWithoutRedis += withoutRedis;
        validComparisons++;
      }
    }

    console.log('└─────────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘');

    if (validComparisons > 0) {
      const avgWithRedis = Math.round(totalWithRedis / validComparisons);
      const avgWithoutRedis = Math.round(totalWithoutRedis / validComparisons);
      const avgDifference = avgWithoutRedis - avgWithRedis;
      const avgPercentChange = ((avgDifference / avgWithoutRedis) * 100).toFixed(1);

      console.log('\n🎯 OVERALL PERFORMANCE:');
      console.log(`   Average with Redis:    ${avgWithRedis}ms`);
      console.log(`   Average without Redis: ${avgWithoutRedis}ms`);
      console.log(`   Average improvement:   ${avgDifference}ms (${avgPercentChange}% faster)`);

      if (avgDifference > 0) {
        console.log('\n✅ Redis is providing performance benefits!');
      } else if (avgDifference < -10) {
        console.log('\n⚠️ Redis might be adding overhead - check configuration');
      } else {
        console.log('\n📊 Redis impact is minimal for these endpoints');
      }
    }

    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      iterations: TEST_ITERATIONS,
      results: this.results,
      grouped
    };

    const reportPath = './performance-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const tester = new SimplePerformanceTester();
  
  try {
    await tester.runTests();
    tester.generateReport();
    
    console.log('\n🎉 Performance testing completed successfully!');
    console.log('\n💡 Tips:');
    console.log('   - Run multiple times for more accurate results');
    console.log('   - Test during different load conditions');
    console.log('   - Check Redis hit rates with: GET /api/redis/stats');
    
  } catch (error) {
    console.error('\n💥 Performance testing failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
