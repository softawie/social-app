import { redisService } from './redis.service';
import { logger } from '@helpers/logger.helper';

/**
 * Redis Toggle Utility
 * Allows enabling/disabling Redis functionality at runtime for performance testing
 */

export class RedisToggle {
  private static isRedisDisabled = false;
  private static originalMethods: any = {};

  /**
   * Disable Redis operations by replacing methods with no-ops
   */
  static async disable(): Promise<void> {
    if (this.isRedisDisabled) {
      logger.log('Redis is already disabled');
      return;
    }

    logger.log('🔴 Disabling Redis operations...');

    // Store original methods
    this.originalMethods = {
      get: redisService.get.bind(redisService),
      set: redisService.set.bind(redisService),
      del: redisService.del.bind(redisService),
      exists: redisService.exists.bind(redisService),
      incr: redisService.incr.bind(redisService),
      expire: redisService.expire.bind(redisService),
      mget: redisService.mget.bind(redisService),
      mset: redisService.mset.bind(redisService),
      delPattern: redisService.delPattern.bind(redisService),
      cacheWithFallback: redisService.cacheWithFallback.bind(redisService)
    };

    // Replace methods with no-ops that return appropriate defaults
    redisService.get = async () => null;
    redisService.set = async () => {};
    redisService.del = async () => {};
    redisService.exists = async () => false;
    redisService.incr = async () => 0;
    redisService.expire = async () => {};
    redisService.mget = async (keys: string[]) => keys.map(() => null);
    redisService.mset = async () => {};
    redisService.delPattern = async () => 0;
    redisService.cacheWithFallback = async (key: string, fallbackFn: () => Promise<any>) => {
      // Always execute fallback function when Redis is disabled
      return await fallbackFn();
    };

    this.isRedisDisabled = true;
    logger.log('✅ Redis operations disabled - all cache calls will be bypassed');
  }

  /**
   * Re-enable Redis operations by restoring original methods
   */
  static async enable(): Promise<void> {
    if (!this.isRedisDisabled) {
      logger.log('Redis is already enabled');
      return;
    }

    logger.log('🟢 Enabling Redis operations...');

    // Restore original methods
    if (this.originalMethods.get) {
      redisService.get = this.originalMethods.get;
      redisService.set = this.originalMethods.set;
      redisService.del = this.originalMethods.del;
      redisService.exists = this.originalMethods.exists;
      redisService.incr = this.originalMethods.incr;
      redisService.expire = this.originalMethods.expire;
      redisService.mget = this.originalMethods.mget;
      redisService.mset = this.originalMethods.mset;
      redisService.delPattern = this.originalMethods.delPattern;
      redisService.cacheWithFallback = this.originalMethods.cacheWithFallback;
    }

    this.isRedisDisabled = false;
    this.originalMethods = {};
    
    logger.log('✅ Redis operations enabled - cache functionality restored');
  }

  /**
   * Check if Redis is currently disabled
   */
  static isDisabled(): boolean {
    return this.isRedisDisabled;
  }

  /**
   * Get current Redis status
   */
  static getStatus(): { enabled: boolean; connected: boolean } {
    return {
      enabled: !this.isRedisDisabled,
      connected: redisService.redis?.status === 'ready'
    };
  }

  /**
   * Toggle Redis state
   */
  static async toggle(): Promise<boolean> {
    if (this.isRedisDisabled) {
      await this.enable();
      return true;
    } else {
      await this.disable();
      return false;
    }
  }

  /**
   * Temporarily disable Redis for a specific operation
   */
  static async withoutRedis<T>(operation: () => Promise<T>): Promise<T> {
    const wasDisabled = this.isRedisDisabled;
    
    if (!wasDisabled) {
      await this.disable();
    }
    
    try {
      const result = await operation();
      return result;
    } finally {
      if (!wasDisabled) {
        await this.enable();
      }
    }
  }

  /**
   * Measure performance difference with and without Redis
   */
  static async measurePerformance<T>(
    operation: () => Promise<T>,
    iterations: number = 5
  ): Promise<{
    withRedis: { avgTime: number; results: T[] };
    withoutRedis: { avgTime: number; results: T[] };
    improvement: { time: number; percentage: number };
  }> {
    logger.log(`📊 Measuring performance for ${iterations} iterations...`);

    // Test with Redis enabled
    await this.enable();
    const withRedisResults: T[] = [];
    const withRedisTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const result = await operation();
      const endTime = Date.now();
      
      withRedisResults.push(result);
      withRedisTimes.push(endTime - startTime);
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test with Redis disabled
    await this.disable();
    const withoutRedisResults: T[] = [];
    const withoutRedisTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      const result = await operation();
      const endTime = Date.now();
      
      withoutRedisResults.push(result);
      withoutRedisTimes.push(endTime - startTime);
      
      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Re-enable Redis
    await this.enable();

    // Calculate averages
    const avgWithRedis = withRedisTimes.reduce((a, b) => a + b, 0) / withRedisTimes.length;
    const avgWithoutRedis = withoutRedisTimes.reduce((a, b) => a + b, 0) / withoutRedisTimes.length;
    
    const improvement = avgWithoutRedis - avgWithRedis;
    const improvementPercentage = avgWithoutRedis > 0 ? (improvement / avgWithoutRedis) * 100 : 0;

    const results = {
      withRedis: { avgTime: Math.round(avgWithRedis), results: withRedisResults },
      withoutRedis: { avgTime: Math.round(avgWithoutRedis), results: withoutRedisResults },
      improvement: { 
        time: Math.round(improvement), 
        percentage: Math.round(improvementPercentage * 100) / 100 
      }
    };

    logger.log(`📈 Performance Results:`);
    logger.log(`   With Redis:    ${results.withRedis.avgTime}ms avg`);
    logger.log(`   Without Redis: ${results.withoutRedis.avgTime}ms avg`);
    logger.log(`   Improvement:   ${results.improvement.time}ms (${results.improvement.percentage}% faster)`);

    return results;
  }
}
