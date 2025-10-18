import { RedisCacheCleanupJob } from '../src/jobs/redis-cache-cleanup.job';
import { redisService } from '@utils/redis.service';
import { RedisConnection } from '@db/redis.connection';

/**
 * Test Redis Cache Cleanup Job
 * This file tests the RedisCacheCleanupJob functionality
 */
export class TestRedisCleanupJob {
  
  /**
   * Test the RedisCacheCleanupJob with sample data
   */
  static async testCleanupJob(): Promise<void> {
    console.log('🧪 [test-redis-cleanup] Starting Redis cleanup job test...');
    
    try {
      // 1. Test Redis connection
      await this.testRedisConnection();
      
      // 2. Create test data
      await this.createTestData();
      
      // 3. Test cleanup patterns
      await this.testCleanupPatterns();
      
      // 4. Test manual cleanup
      await this.testManualCleanup();
      
      // 5. Test cleanup statistics
      await this.testCleanupStats();
      
      console.log('✅ [test-redis-cleanup] All tests completed successfully');
      
    } catch (error) {
      console.error('❌ [test-redis-cleanup] Test failed:', error);
      throw error;
    }
  }

  /**
   * Test Redis connection
   */
  private static async testRedisConnection(): Promise<void> {
    console.log('🔌 [test-redis-cleanup] Testing Redis connection...');
    
    const redis = RedisConnection.getInstance();
    const pingResult = await redis.ping();
    
    if (pingResult !== 'PONG') {
      throw new Error('Redis connection test failed');
    }
    
    console.log('✅ [test-redis-cleanup] Redis connection successful');
  }

  /**
   * Create test data for cleanup testing
   */
  private static async createTestData(): Promise<void> {
    console.log('📝 [test-redis-cleanup] Creating test data...');
    
    const testData = {
      // Session data
      'session:test-session-1': { userId: 'user1', email: 'test1@example.com' },
      'session:test-session-2': { userId: 'user2', email: 'test2@example.com' },
      
      // Token data
      'token:test-token-1': { accessToken: 'token1', refreshToken: 'refresh1' },
      'token:test-token-2': { accessToken: 'token2', refreshToken: 'refresh2' },
      
      // User data
      'user:test-user-1': { id: 'user1', name: 'Test User 1' },
      'user:test-user-2': { id: 'user2', name: 'Test User 2' },
      
      // Post data
      'posts:test-post-1': { id: 'post1', title: 'Test Post 1' },
      'posts:test-post-2': { id: 'post2', title: 'Test Post 2' },
      
      // Rate limiting data
      'rate_limit:test-ip-1': 5,
      'rate_limit:test-ip-2': 3,
      
      // Temporary data
      'temp:test-temp-1': { data: 'temporary data 1' },
      'temp:test-temp-2': { data: 'temporary data 2' },
      
      // OTP data
      'otp:test-otp-1': '123456',
      'otp:test-otp-2': '654321',
      
      // Friend requests
      'friend_requests:test-user-1': ['user2', 'user3'],
      'friend_requests:test-user-2': ['user1', 'user4']
    };

    // Set test data with different TTLs
    for (const [key, value] of Object.entries(testData)) {
      let ttl = 3600; // 1 hour default
      
      // Set different TTLs based on data type
      if (key.startsWith('session:')) ttl = 86400; // 24 hours
      if (key.startsWith('token:')) ttl = 7200; // 2 hours
      if (key.startsWith('user:')) ttl = 1800; // 30 minutes
      if (key.startsWith('posts:')) ttl = 600; // 10 minutes
      if (key.startsWith('rate_limit:')) ttl = 300; // 5 minutes
      if (key.startsWith('temp:')) ttl = 60; // 1 minute
      if (key.startsWith('otp:')) ttl = 300; // 5 minutes
      if (key.startsWith('friend_requests:')) ttl = 600; // 10 minutes
      
      await redisService.set(key, value, { ttl });
    }
    
    console.log('✅ [test-redis-cleanup] Test data created successfully');
  }

  /**
   * Test cleanup patterns
   */
  private static async testCleanupPatterns(): Promise<void> {
    console.log('🧹 [test-redis-cleanup] Testing cleanup patterns...');
    
    // Test session cleanup
    const sessionKeysBefore = await redisService.scanKeys('session:*');
    console.log(`📊 [test-redis-cleanup] Session keys before cleanup: ${sessionKeysBefore.length}`);
    
    // Test token cleanup
    const tokenKeysBefore = await redisService.scanKeys('token:*');
    console.log(`📊 [test-redis-cleanup] Token keys before cleanup: ${tokenKeysBefore.length}`);
    
    // Test user cleanup
    const userKeysBefore = await redisService.scanKeys('user:*');
    console.log(`📊 [test-redis-cleanup] User keys before cleanup: ${userKeysBefore.length}`);
    
    console.log('✅ [test-redis-cleanup] Cleanup patterns tested successfully');
  }

  /**
   * Test manual cleanup
   */
  private static async testManualCleanup(): Promise<void> {
    console.log('🔧 [test-redis-cleanup] Testing manual cleanup...');
    
    // Test frequent cleanup
    console.log('🧹 [test-redis-cleanup] Running frequent cleanup...');
    await RedisCacheCleanupJob.triggerManualCleanup('frequent');
    
    // Test medium cleanup
    console.log('🧹 [test-redis-cleanup] Running medium cleanup...');
    await RedisCacheCleanupJob.triggerManualCleanup('medium');
    
    // Test daily cleanup
    console.log('🧹 [test-redis-cleanup] Running daily cleanup...');
    await RedisCacheCleanupJob.triggerManualCleanup('daily');
    
    console.log('✅ [test-redis-cleanup] Manual cleanup tests completed');
  }

  /**
   * Test cleanup statistics
   */
  private static async testCleanupStats(): Promise<void> {
    console.log('📊 [test-redis-cleanup] Testing cleanup statistics...');
    
    const stats = await RedisCacheCleanupJob.getCleanupStats();
    console.log('📈 [test-redis-cleanup] Cleanup statistics:', JSON.stringify(stats, null, 2));
    
    console.log('✅ [test-redis-cleanup] Cleanup statistics test completed');
  }

  /**
   * Clean up test data
   */
  static async cleanupTestData(): Promise<void> {
    console.log('🧹 [test-redis-cleanup] Cleaning up test data...');
    
    const testPatterns = [
      'session:test-*',
      'token:test-*',
      'user:test-*',
      'posts:test-*',
      'rate_limit:test-*',
      'temp:test-*',
      'otp:test-*',
      'friend_requests:test-*'
    ];

    let totalDeleted = 0;
    for (const pattern of testPatterns) {
      const deleted = await redisService.delPattern(pattern);
      totalDeleted += deleted;
    }
    
    console.log(`✅ [test-redis-cleanup] Cleaned up ${totalDeleted} test keys`);
  }

  /**
   * Run comprehensive test
   */
  static async runComprehensiveTest(): Promise<void> {
    console.log('🚀 [test-redis-cleanup] Starting comprehensive Redis cleanup test...');
    
    try {
      // Run tests
      await this.testCleanupJob();
      
      // Clean up test data
      await this.cleanupTestData();
      
      console.log('🎉 [test-redis-cleanup] Comprehensive test completed successfully');
      
    } catch (error) {
      console.error('💥 [test-redis-cleanup] Comprehensive test failed:', error);
      throw error;
    }
  }
}

// Export for use in other files
export default TestRedisCleanupJob;
