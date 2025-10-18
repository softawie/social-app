import cron from 'node-cron';
import { redisService } from '@utils/redis.service';
import { RedisConnection } from '@db/redis.connection';

export class RedisCacheCleanupJob {
  private static readonly CACHE_PATTERNS = {
    // Session caches (expire after 24 hours)
    sessions: 'session:*',
    tokens: 'token:*',
    
    // User data caches (expire after 1 hour)
    users: 'user:*',
    profiles: 'profile:*',
    
    // Post caches (expire after 30 minutes)
    posts: 'posts:*',
    comments: 'comments:*',
    
    // Rate limiting (expire after 1 hour)
    rateLimit: 'rate_limit:*',
    
    // Temporary data (expire after 5 minutes)
    temp: 'temp:*',
    otp: 'otp:*',
    
    // Friend requests (expire after 10 minutes)
    friendRequests: 'friend_requests:*',
    
    // All expired keys
    expired: '*'
  };

  /**
   * Start all Redis cleanup jobs
   */
  static startAllCleanupJobs(): void {
    this.startFrequentCleanup();
    this.startMediumCleanup();
    this.startDailyCleanup();
    this.startWeeklyDeepCleanup();
    
    console.log('🔄 [redis-cleanup] All Redis cleanup jobs started');
  }

  /**
   * Frequent cleanup - Every 2 hours
   * Cleans: Sessions, tokens, rate limits, temporary data
   */
  static startFrequentCleanup(): void {
    // Every 2 hours at minute 0
    cron.schedule('0 */2 * * *', async () => {
      console.log('🧹 [redis-cleanup] Starting frequent cleanup...');
      await this.cleanupByPatterns([
        this.CACHE_PATTERNS.sessions,
        this.CACHE_PATTERNS.tokens,
        this.CACHE_PATTERNS.rateLimit,
        this.CACHE_PATTERNS.temp,
        this.CACHE_PATTERNS.otp
      ], 'frequent');
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [redis-cleanup] Scheduled frequent cleanup every 2 hours');
  }

  /**
   * Medium cleanup - Every 6 hours
   * Cleans: User data, posts, comments, friend requests
   */
  static startMediumCleanup(): void {
    // Every 6 hours at minute 0
    cron.schedule('0 */6 * * *', async () => {
      console.log('🧹 [redis-cleanup] Starting medium cleanup...');
      await this.cleanupByPatterns([
        this.CACHE_PATTERNS.users,
        this.CACHE_PATTERNS.profiles,
        this.CACHE_PATTERNS.posts,
        this.CACHE_PATTERNS.comments,
        this.CACHE_PATTERNS.friendRequests
      ], 'medium');
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [redis-cleanup] Scheduled medium cleanup every 6 hours');
  }

  /**
   * Daily cleanup - Every day at 2 AM
   * Cleans: All expired keys and performs memory optimization
   */
  static startDailyCleanup(): void {
    // Daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('🧹 [redis-cleanup] Starting daily cleanup...');
      await this.performDailyCleanup();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [redis-cleanup] Scheduled daily cleanup at 2:00 AM UTC');
  }

  /**
   * Weekly deep cleanup - Every Sunday at 3 AM
   * Performs comprehensive cleanup and memory optimization
   */
  static startWeeklyDeepCleanup(): void {
    // Every Sunday at 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 [redis-cleanup] Starting weekly deep cleanup...');
      await this.performWeeklyDeepCleanup();
    }, {
      timezone: 'UTC'
    });

    console.log('📅 [redis-cleanup] Scheduled weekly deep cleanup every Sunday at 3:00 AM UTC');
  }

  /**
   * Cleanup by specific patterns
   */
  private static async cleanupByPatterns(patterns: string[], type: string): Promise<void> {
    try {
      let totalDeleted = 0;
      let totalMemoryFreed = 0;

      for (const pattern of patterns) {
        const result = await this.cleanupPattern(pattern);
        totalDeleted += result.deleted;
        totalMemoryFreed += result.memoryFreed;
      }

      console.log(`✅ [redis-cleanup] ${type} cleanup completed: ${totalDeleted} keys deleted, ${(totalMemoryFreed / 1024 / 1024).toFixed(2)} MB freed`);
      
      // Log cleanup action
      await this.logCleanupAction(type, totalDeleted, totalMemoryFreed);

    } catch (error) {
      console.error(`❌ [redis-cleanup] Error during ${type} cleanup:`, error);
    }
  }

  /**
   * Cleanup specific pattern
   */
  private static async cleanupPattern(pattern: string): Promise<{ deleted: number; memoryFreed: number }> {
    try {
      const keys = await redisService.scanKeys(pattern);
      let deleted = 0;
      let memoryFreed = 0;

      if (keys.length === 0) {
        return { deleted: 0, memoryFreed: 0 };
      }

      // Get memory usage before deletion
      const memoryBefore = await this.getMemoryUsage();

      // Delete keys in batches to avoid blocking Redis
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const deletedCount = await redisService.delPattern(pattern);
        deleted += deletedCount;
        
        // Small delay to prevent blocking
        if (i + batchSize < keys.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Calculate memory freed
      const memoryAfter = await this.getMemoryUsage();
      memoryFreed = memoryBefore - memoryAfter;

      console.log(`🗑️  [redis-cleanup] Pattern '${pattern}': ${deleted} keys deleted`);
      
      return { deleted, memoryFreed };

    } catch (error) {
      console.error(`❌ [redis-cleanup] Error cleaning pattern '${pattern}':`, error);
      return { deleted: 0, memoryFreed: 0 };
    }
  }

  /**
   * Daily cleanup - comprehensive cleanup
   */
  private static async performDailyCleanup(): Promise<void> {
    try {
      // 1. Clean all expired keys
      const expiredResult = await this.cleanupExpiredKeys();
      
      // 2. Clean specific patterns
      const patternResult = await this.cleanupByPatterns([
        this.CACHE_PATTERNS.sessions,
        this.CACHE_PATTERNS.tokens,
        this.CACHE_PATTERNS.users,
        this.CACHE_PATTERNS.posts
      ], 'daily');

      // 3. Memory optimization
      await this.optimizeMemory();

      // 4. Log statistics
      await this.logDailyStats();

      console.log('✅ [redis-cleanup] Daily cleanup completed successfully');

    } catch (error) {
      console.error('❌ [redis-cleanup] Error during daily cleanup:', error);
    }
  }

  /**
   * Weekly deep cleanup - comprehensive cleanup and optimization
   */
  private static async performWeeklyDeepCleanup(): Promise<void> {
    try {
      console.log('🔍 [redis-cleanup] Starting weekly deep cleanup...');

      // 1. Clean all expired keys
      const expiredResult = await this.cleanupExpiredKeys();
      
      // 2. Clean all cache patterns
      const allPatterns = Object.values(this.CACHE_PATTERNS).filter(p => p !== '*');
      const patternResult = await this.cleanupByPatterns(allPatterns, 'weekly');

      // 3. Memory optimization
      await this.optimizeMemory();

      // 4. Redis memory defragmentation
      await this.defragmentMemory();

      // 5. Log comprehensive statistics
      await this.logWeeklyStats();

      console.log('✅ [redis-cleanup] Weekly deep cleanup completed successfully');

    } catch (error) {
      console.error('❌ [redis-cleanup] Error during weekly deep cleanup:', error);
    }
  }

  /**
   * Clean expired keys
   */
  private static async cleanupExpiredKeys(): Promise<{ deleted: number; memoryFreed: number }> {
    try {
      const memoryBefore = await this.getMemoryUsage();
      
      // Redis automatically removes expired keys, but we can force cleanup
      const redis = RedisConnection.getInstance();
      await redis.eval(`
        local keys = redis.call('keys', '*')
        local deleted = 0
        for i=1,#keys do
          local ttl = redis.call('ttl', keys[i])
          if ttl == -1 then
            redis.call('del', keys[i])
            deleted = deleted + 1
          end
        end
        return deleted
      `, 0);

      const memoryAfter = await this.getMemoryUsage();
      const memoryFreed = memoryBefore - memoryAfter;

      console.log(`🗑️  [redis-cleanup] Expired keys cleanup completed`);
      
      return { deleted: 0, memoryFreed }; // Redis handles expired keys automatically

    } catch (error) {
      console.error('❌ [redis-cleanup] Error cleaning expired keys:', error);
      return { deleted: 0, memoryFreed: 0 };
    }
  }

  /**
   * Optimize Redis memory
   */
  private static async optimizeMemory(): Promise<void> {
    try {
      const redis = RedisConnection.getInstance();
      
      // Set memory policy to LRU if not already set
      await redis.config('SET', 'maxmemory-policy', 'allkeys-lru');
      
      // Trigger memory optimization
      await redis.memory('PURGE');
      
      console.log('🔧 [redis-cleanup] Memory optimization completed');

    } catch (error) {
      console.error('❌ [redis-cleanup] Error optimizing memory:', error);
    }
  }

  /**
   * Defragment memory (Redis 4.0+)
   */
  private static async defragmentMemory(): Promise<void> {
    try {
      const redis = RedisConnection.getInstance();
      
      // Check Redis version first
      const info = await redis.info('server');
      const version = info.match(/redis_version:(\d+\.\d+)/)?.[1];
      
      if (version && parseFloat(version) >= 4.0) {
        try {
          // Use eval to call MEMORY DEFRAG
          await redis.eval('return redis.call("MEMORY", "DEFRAG")', 0);
          console.log('🔧 [redis-cleanup] Memory defragmentation completed');
        } catch (error) {
          console.log('ℹ️  [redis-cleanup] Memory defragmentation not supported');
        }
      } else {
        console.log('ℹ️  [redis-cleanup] Memory defragmentation skipped (Redis < 4.0)');
      }

    } catch (error) {
      console.error('❌ [redis-cleanup] Error defragmenting memory:', error);
    }
  }

  /**
   * Get current memory usage
   */
  private static async getMemoryUsage(): Promise<number> {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      console.error('❌ [redis-cleanup] Error getting memory usage:', error);
      return 0;
    }
  }

  /**
   * Log cleanup action
   */
  private static async logCleanupAction(type: string, deleted: number, memoryFreed: number): Promise<void> {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        type: `redis_cleanup_${type}`,
        deleted,
        memoryFreed: Math.round(memoryFreed / 1024 / 1024), // MB
        memoryUsage: await this.getMemoryUsage()
      };

      // Log to Redis for monitoring
      const redis = RedisConnection.getInstance();
      await redis.lpush('cleanup_logs', JSON.stringify(logData));
      
      // Keep only last 1000 log entries
      await redis.ltrim('cleanup_logs', 0, 999);

    } catch (error) {
      console.error('❌ [redis-cleanup] Error logging cleanup action:', error);
    }
  }

  /**
   * Log daily statistics
   */
  private static async logDailyStats(): Promise<void> {
    try {
      const stats = await this.getRedisStats();
      console.log('📊 [redis-cleanup] Daily Redis stats:', stats);
    } catch (error) {
      console.error('❌ [redis-cleanup] Error getting daily stats:', error);
    }
  }

  /**
   * Log weekly statistics
   */
  private static async logWeeklyStats(): Promise<void> {
    try {
      const stats = await this.getRedisStats();
      const cleanupLogs = await redisService.lrange('cleanup_logs', 0, -1);
      
      console.log('📊 [redis-cleanup] Weekly Redis stats:', stats);
      console.log('📊 [redis-cleanup] Cleanup history:', cleanupLogs.length, 'entries');

    } catch (error) {
      console.error('❌ [redis-cleanup] Error getting weekly stats:', error);
    }
  }

  /**
   * Get Redis statistics
   */
  private static async getRedisStats(): Promise<any> {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info('all');
      const memory = await this.getMemoryUsage();
      
      return {
        memoryUsage: `${(memory / 1024 / 1024).toFixed(2)} MB`,
        connectedClients: info.match(/connected_clients:(\d+)/)?.[1] || '0',
        totalCommands: info.match(/total_commands_processed:(\d+)/)?.[1] || '0',
        keyspaceHits: info.match(/keyspace_hits:(\d+)/)?.[1] || '0',
        keyspaceMisses: info.match(/keyspace_misses:(\d+)/)?.[1] || '0'
      };
    } catch (error) {
      console.error('❌ [redis-cleanup] Error getting Redis stats:', error);
      return {};
    }
  }

  /**
   * Manual cleanup trigger
   */
  static async triggerManualCleanup(type: 'frequent' | 'medium' | 'daily' | 'weekly' = 'daily'): Promise<void> {
    console.log(`🔧 [redis-cleanup] Manual ${type} cleanup triggered`);
    
    switch (type) {
      case 'frequent':
        await this.cleanupByPatterns([
          this.CACHE_PATTERNS.sessions,
          this.CACHE_PATTERNS.tokens,
          this.CACHE_PATTERNS.rateLimit,
          this.CACHE_PATTERNS.temp,
          this.CACHE_PATTERNS.otp
        ], 'manual_frequent');
        break;
      case 'medium':
        await this.cleanupByPatterns([
          this.CACHE_PATTERNS.users,
          this.CACHE_PATTERNS.profiles,
          this.CACHE_PATTERNS.posts,
          this.CACHE_PATTERNS.comments,
          this.CACHE_PATTERNS.friendRequests
        ], 'manual_medium');
        break;
      case 'daily':
        await this.performDailyCleanup();
        break;
      case 'weekly':
        await this.performWeeklyDeepCleanup();
        break;
    }
  }

  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<any> {
    try {
      const stats = await this.getRedisStats();
      const redis = RedisConnection.getInstance();
      const cleanupLogs = await redis.lrange('cleanup_logs', 0, 9); // Last 10 entries
      
      return {
        ...stats,
        recentCleanups: cleanupLogs.map(log => JSON.parse(log)),
        nextCleanups: {
          frequent: 'Every 2 hours',
          medium: 'Every 6 hours',
          daily: 'Daily at 2:00 AM UTC',
          weekly: 'Every Sunday at 3:00 AM UTC'
        }
      };
    } catch (error) {
      console.error('❌ [redis-cleanup] Error getting cleanup stats:', error);
      return {};
    }
  }
}
