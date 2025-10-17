import { Request, Response } from 'express';
import { redisService } from '@utils/redis.service';
import { RedisConnection } from '@db/redis.connection';
import { RedisLogger } from '@utils/redis-logger.service';
import { RedisToggle } from '@utils/redis-toggle.utils';

export class RedisController {
  /**
   * Get Redis information
   */
  static async getRedisInfo(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info();
      
      // Parse Redis info into key-value pairs
      const parsedInfo: Record<string, any> = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          parsedInfo[key] = value;
        }
      }

      // Calculate total keys across all databases
      let totalKeys = 0;
      for (const [key, value] of Object.entries(parsedInfo)) {
        if (key.startsWith('db') && typeof value === 'string') {
          const match = value.match(/keys=(\d+)/);
          if (match) {
            totalKeys += parseInt(match[1]);
          }
        }
      }
      parsedInfo.total_keys = totalKeys;

      return res.status(200).json({ success: true, message: 'Redis info retrieved successfully', data: parsedInfo });
    } catch (error) {
      console.error('Redis info error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis info' });
    }
  }

  /**
   * Get Redis statistics
   */
  static async getRedisStats(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info('stats');
      
      const parsedInfo: Record<string, any> = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          parsedInfo[key] = value;
        }
      }

      // Calculate hit rate
      const hits = parseInt(parsedInfo.keyspace_hits || '0');
      const misses = parseInt(parsedInfo.keyspace_misses || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%';

      const stats = {
        commands_processed: parsedInfo.total_commands_processed,
        keyspace_hits: hits,
        keyspace_misses: misses,
        hit_rate: hitRate,
        connections_received: parsedInfo.total_connections_received,
        expired_keys: parsedInfo.expired_keys,
        evicted_keys: parsedInfo.evicted_keys
      };

      return res.status(200).json({ success: true, message: 'Redis stats retrieved successfully', data: stats });
    } catch (error) {
      console.error('Redis stats error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis stats' });
    }
  }

  /**
   * Get cache keys by pattern with detailed information
   */
  static async getCacheKeys(req: Request, res: Response) {
    try {
      const { pattern = '*', limit = '100', offset = '0', detailed = 'false' } = req.query;
      const redis = RedisConnection.getInstance();
      
      const keys = await redis.keys(pattern as string);
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const isDetailed = detailed === 'true';
      
      // Paginate keys
      const paginatedKeys = keys.slice(offsetNum, offsetNum + limitNum);
      
      let keyDetails: any = paginatedKeys;
      
      if (isDetailed) {
        // Get detailed information for each key
        keyDetails = await Promise.all(
          paginatedKeys.map(async (key) => {
            try {
              const ttl = await redis.ttl(key);
              const type = await redis.type(key);
              const size = await redis.memory('USAGE', key);
              
              return {
                key,
                type,
                ttl: ttl === -1 ? 'No expiration' : ttl === -2 ? 'Key not found' : `${ttl}s`,
                size: size ? `${Math.round(size / 1024 * 100) / 100} KB` : 'Unknown',
                expires: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null
              };
            } catch (error) {
              return {
                key,
                type: 'unknown',
                ttl: 'Error',
                size: 'Error',
                expires: null
              };
            }
          })
        );
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Cache keys retrieved successfully', 
        data: {
          keys: keyDetails,
          total: keys.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < keys.length
        }
      });
    } catch (error) {
      console.error('Get cache keys error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get cache keys' });
    }
  }

  /**
   * Get cache key information (TTL, type, size)
   */
  static async getCacheKeyInfo(req: Request, res: Response) {
    try {
      const { key } = req.params;
      
      if (!key) {
        return res.status(400).json({ success: false, message: 'Key parameter is required' });
      }

      const redis = RedisConnection.getInstance();
      
      const exists = await redis.exists(key);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Key not found' });
      }

      const ttl = await redis.ttl(key);
      const type = await redis.type(key);
      const size = await redis.memory('USAGE', key);
      
      const keyInfo = {
        key,
        exists: true,
        type,
        ttl: ttl === -1 ? 'No expiration' : ttl === -2 ? 'Key not found' : ttl,
        ttlSeconds: ttl,
        size: size || 0,
        sizeFormatted: size ? `${Math.round(size / 1024 * 100) / 100} KB` : '0 KB',
        expires: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null,
        createdAgo: ttl > 0 ? 'Unknown' : 'Persistent key'
      };

      return res.status(200).json({ success: true, message: 'Cache key info retrieved successfully', data: keyInfo });
    } catch (error) {
      console.error('Get cache key info error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get cache key info' });
    }
  }

  /**
   * Set TTL for a cache key
   */
  static async setCacheKeyTTL(req: Request, res: Response) {
    try {
      const { key, ttl } = req.body;
      
      if (!key || ttl === undefined) {
        return res.status(400).json({ success: false, message: 'Key and TTL are required' });
      }

      const redis = RedisConnection.getInstance();
      
      const exists = await redis.exists(key);
      if (!exists) {
        return res.status(404).json({ success: false, message: 'Key not found' });
      }

      const result = await redis.expire(key, parseInt(ttl));
      
      return res.status(200).json({ 
        success: true, 
        message: 'TTL set successfully', 
        data: { key, ttl: parseInt(ttl), result } 
      });
    } catch (error) {
      console.error('Set cache key TTL error:', error);
      return res.status(500).json({ success: false, message: 'Failed to set cache key TTL' });
    }
  }

  /**
   * Get cache value by key
   */
  static async getCacheValue(req: Request, res: Response) {
    try {
      const { key } = req.query;
      
      if (!key) {
        return res.status(400).json({ success: false, message: 'Key parameter is required' });
      }

      const value = await redisService.get(key as string, { serialize: false });
      
      if (value === null) {
        return res.status(404).json({ success: false, message: 'Key not found' });
      }

      // Try to parse as JSON, if it fails return as string
      let parsedValue;
      try {
        parsedValue = JSON.parse(value as string);
      } catch {
        parsedValue = value;
      }

      return res.status(200).json({ success: true, message: 'Cache value retrieved successfully', data: parsedValue });
    } catch (error) {
      console.error('Get cache value error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get cache value' });
    }
  }

  /**
   * Clear cache by pattern (enhanced with SCAN)
   */
  static async clearCachePattern(req: Request, res: Response) {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        return res.status(400).json({ success: false, message: 'Pattern is required' });
      }

      const deletedCount = await redisService.delPattern(pattern);

      // Log the cache clear operation
      await RedisLogger.logCacheClear(pattern, deletedCount);

      return res.status(200).json({ 
        success: true, 
        message: 'Cache pattern cleared successfully', 
        data: { pattern, deletedCount } 
      });
    } catch (error) {
      console.error('Clear cache pattern error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear cache pattern' });
    }
  }

  /**
   * Clear all cache by prefix
   */
  static async clearAllCache(req: Request, res: Response) {
    try {
      const { prefix = 'api' } = req.body;
      const pattern = `${prefix}:*`;
      
      const deletedCount = await redisService.delPattern(pattern);
      
      // Log the cache clear operation
      await RedisLogger.logCacheClear(pattern, deletedCount);

      return res.status(200).json({ 
        success: true, 
        message: 'All cache cleared successfully', 
        data: { prefix, deletedCount } 
      });
    } catch (error) {
      console.error('Clear all cache error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear all cache' });
    }
  }

  /**
   * Clear specific entity cache
   */
  static async clearEntityCache(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.body;
      
      if (!entityType) {
        return res.status(400).json({ success: false, message: 'Entity type is required' });
      }

      const deletedCount = entityId 
        ? await redisService.invalidateEntity(entityType, entityId)
        : await redisService.delPattern(`${entityType}:*`);
      
      // Log the cache clear operation
      const pattern = entityId ? `${entityType}:${entityId}:*` : `${entityType}:*`;
      await RedisLogger.logCacheClear(pattern, deletedCount);

      return res.status(200).json({ 
        success: true, 
        message: 'Entity cache cleared successfully', 
        data: { entityType, entityId, deletedCount } 
      });
    } catch (error) {
      console.error('Clear entity cache error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear entity cache' });
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      
      // Get database size
      const dbSize = await redis.dbsize();
      
      // Get memory info
      const memoryInfo = await redisService.getMemoryInfo();
      
      // Get keyspace info
      const keyspaceInfo = await redis.info('keyspace');
      
      // Count keys by prefix
      const prefixCounts: Record<string, number> = {};
      const commonPrefixes = ['api', 'cache', 'session', 'user', 'rate_limit', 'redis'];
      
      for (const prefix of commonPrefixes) {
        const keys = await redisService.scanKeys(`${prefix}:*`);
        prefixCounts[prefix] = keys.length;
      }

      const stats = {
        totalKeys: dbSize,
        usedMemory: memoryInfo.used_memory_human || 'Unknown',
        usedMemoryPeak: memoryInfo.used_memory_peak_human || 'Unknown',
        memoryFragmentation: parseFloat(memoryInfo.mem_fragmentation_ratio || '0'),
        prefixCounts,
        keyspaceHits: parseInt(memoryInfo.keyspace_hits || '0'),
        keyspaceMisses: parseInt(memoryInfo.keyspace_misses || '0'),
        hitRate: memoryInfo.keyspace_hits && memoryInfo.keyspace_misses 
          ? ((parseInt(memoryInfo.keyspace_hits) / (parseInt(memoryInfo.keyspace_hits) + parseInt(memoryInfo.keyspace_misses))) * 100).toFixed(2) + '%'
          : 'N/A'
      };

      return res.status(200).json({ 
        success: true, 
        message: 'Cache statistics retrieved successfully', 
        data: stats 
      });
    } catch (error) {
      console.error('Get cache stats error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get cache statistics' });
    }
  }

  /**
   * Delete specific cache key
   */
  static async deleteCacheKey(req: Request, res: Response) {
    try {
      const { key } = req.body;
      
      if (!key) {
        return res.status(400).json({ success: false, message: 'Key is required' });
      }

      await redisService.del(key);

      return res.status(200).json({ success: true, message: 'Cache key deleted successfully', data: { key } });
    } catch (error) {
      console.error('Delete cache key error:', error);
      return res.status(500).json({ success: false, message: 'Failed to delete cache key' });
    }
  }

  /**
   * Flush all Redis data
   */
  static async flushAll(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      await redis.flushall();

      return res.status(200).json({ success: true, message: 'All Redis data flushed successfully', data: null });
    } catch (error) {
      console.error('Flush all error:', error);
      return res.status(500).json({ success: false, message: 'Failed to flush Redis data' });
    }
  }

  /**
   * Get Redis memory usage
   */
  static async getMemoryUsage(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info('memory');
      
      const parsedInfo: Record<string, any> = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          parsedInfo[key] = value;
        }
      }

      const memoryData = {
        used_memory: parsedInfo.used_memory,
        used_memory_human: parsedInfo.used_memory_human,
        used_memory_rss: parsedInfo.used_memory_rss,
        used_memory_rss_human: parsedInfo.used_memory_rss_human,
        used_memory_peak: parsedInfo.used_memory_peak,
        used_memory_peak_human: parsedInfo.used_memory_peak_human,
        mem_fragmentation_ratio: parsedInfo.mem_fragmentation_ratio,
        maxmemory: parsedInfo.maxmemory,
        maxmemory_human: parsedInfo.maxmemory_human,
        maxmemory_policy: parsedInfo.maxmemory_policy
      };

      return res.status(200).json({ success: true, message: 'Memory usage retrieved successfully', data: memoryData });
    } catch (error) {
      console.error('Get memory usage error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get memory usage' });
    }
  }

  /**
   * Get keyspace information
   */
  static async getKeyspaceInfo(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const info = await redis.info('keyspace');
      
      const parsedInfo: Record<string, any> = {};
      const lines = info.split('\r\n');
      
      for (const line of lines) {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          if (key.startsWith('db')) {
            // Parse db info: keys=X,expires=Y,avg_ttl=Z
            const dbInfo: Record<string, any> = {};
            const parts = value.split(',');
            for (const part of parts) {
              const [k, v] = part.split('=');
              dbInfo[k] = v;
            }
            parsedInfo[key] = dbInfo;
          }
        }
      }

      return res.status(200).json({ success: true, message: 'Keyspace info retrieved successfully', data: parsedInfo });
    } catch (error) {
      console.error('Get keyspace info error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get keyspace info' });
    }
  }

  /**
   * Get Redis configuration
   */
  static async getRedisConfig(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const config = await redis.config('GET', '*') as string[];
      
      // Convert array to object
      const configObj: Record<string, any> = {};
      for (let i = 0; i < config.length; i += 2) {
        configObj[config[i]] = config[i + 1];
      }

      return res.status(200).json({ success: true, message: 'Redis config retrieved successfully', data: configObj });
    } catch (error) {
      console.error('Get Redis config error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis config' });
    }
  }

  /**
   * Get Redis clients
   */
  static async getRedisClients(req: Request, res: Response) {
    try {
      const redis = RedisConnection.getInstance();
      const clientList = await redis.client('LIST') as string;
      
      // Parse client list
      const clients = clientList.split('\n').filter((line: string) => line.trim()).map((line: string) => {
        const client: Record<string, any> = {};
        const parts = line.split(' ');
        for (const part of parts) {
          const [key, value] = part.split('=');
          if (key && value) {
            client[key] = value;
          }
        }
        return client;
      });

      return res.status(200).json({ success: true, message: 'Redis clients retrieved successfully', data: clients });
    } catch (error) {
      console.error('Get Redis clients error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis clients' });
    }
  }

  /**
   * Get Redis logs (real implementation using RedisLogger)
   */
  static async getRedisLogs(req: Request, res: Response) {
    try {
      const { limit = '100', level, operation } = req.query;
      const limitNum = parseInt(limit as string);
      
      let logs;
      
      if (level) {
        logs = await RedisLogger.getLogsByLevel(level as any, limitNum);
      } else if (operation) {
        logs = await RedisLogger.getLogsByOperation(operation as string, limitNum);
      } else {
        logs = await RedisLogger.getLogs(limitNum);
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Redis logs retrieved successfully', 
        data: logs,
        meta: {
          count: logs.length,
          limit: limitNum,
          filters: { level, operation }
        }
      });
    } catch (error) {
      console.error('Get Redis logs error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis logs' });
    }
  }

  /**
   * Clear Redis logs (real implementation)
   */
  static async clearRedisLogs(req: Request, res: Response) {
    try {
      const deletedCount = await RedisLogger.clearLogs();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Redis logs cleared successfully', 
        data: { deletedCount } 
      });
    } catch (error) {
      console.error('Clear Redis logs error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear Redis logs' });
    }
  }

  /**
   * Toggle Redis on/off for performance testing
   */
  static async toggleRedis(req: Request, res: Response) {
    try {
      const { enable } = req.body;
      
      if (enable === undefined) {
        // Just toggle current state
        const newState = await RedisToggle.toggle();
        return res.status(200).json({
          success: true,
          message: `Redis ${newState ? 'enabled' : 'disabled'} successfully`,
          data: { enabled: newState }
        });
      }
      
      // Set specific state
      if (enable) {
        await RedisToggle.enable();
      } else {
        await RedisToggle.disable();
      }
      
      return res.status(200).json({
        success: true,
        message: `Redis ${enable ? 'enabled' : 'disabled'} successfully`,
        data: { enabled: enable }
      });
    } catch (error) {
      console.error('Toggle Redis error:', error);
      return res.status(500).json({ success: false, message: 'Failed to toggle Redis' });
    }
  }

  /**
   * Get Redis toggle status
   */
  static async getRedisStatus(req: Request, res: Response) {
    try {
      const status = RedisToggle.getStatus();
      
      return res.status(200).json({
        success: true,
        message: 'Redis status retrieved successfully',
        data: status
      });
    } catch (error) {
      console.error('Get Redis status error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis status' });
    }
  }

  /**
   * Performance test endpoint - measures operation with and without Redis
   */
  static async performanceTest(req: Request, res: Response) {
    try {
      const { operation = 'login', iterations = 5 } = req.body;
      
      // Define test operations
      const testOperations: Record<string, () => Promise<any>> = {
        login: async () => {
          // Simulate login operation
          const user = await redisService.get('user_credentials:test@example.com');
          return user || { simulated: true };
        },
        getUsers: async () => {
          // Simulate get users operation
          const users = await redisService.get('api:users:list');
          return users || { simulated: true };
        },
        getPosts: async () => {
          // Simulate get posts operation
          const posts = await redisService.get('api:posts:list');
          return posts || { simulated: true };
        }
      };
      
      const testFn = testOperations[operation];
      if (!testFn) {
        return res.status(400).json({
          success: false,
          message: `Unknown operation: ${operation}. Available: ${Object.keys(testOperations).join(', ')}`
        });
      }
      
      // Measure performance
      const results = await RedisToggle.measurePerformance(testFn, iterations);
      
      return res.status(200).json({
        success: true,
        message: 'Performance test completed successfully',
        data: {
          operation,
          iterations,
          results
        }
      });
    } catch (error) {
      console.error('Performance test error:', error);
      return res.status(500).json({ success: false, message: 'Failed to run performance test' });
    }
  }
}
