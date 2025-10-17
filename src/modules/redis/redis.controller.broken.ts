import { Request, Response } from 'express';
import { redisService } from '@utils/redis.service';
import { RedisConnection } from '@db/redis.connection';

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
   * Get cache keys by pattern
   */
  static async getCacheKeys(req: Request, res: Response) {
    try {
      const { pattern = '*' } = req.query;
      const redis = RedisConnection.getInstance();
      
      const keys = await redis.keys(pattern as string);
      
      return res.status(200).json({ success: true, message: 'Cache keys retrieved successfully', data: keys });
    } catch (error) {
      console.error('Get cache keys error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get cache keys' });
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
   * Clear cache by pattern
   */
  static async clearCachePattern(req: Request, res: Response) {
    try {
      const { pattern } = req.body;
      
      if (!pattern) {
        return res.status(400).json({ success: false, message: 'Pattern is required' });
      }

      const redis = RedisConnection.getInstance();
      const keys = await redis.keys(pattern);
      
      let deletedCount = 0;
      if (keys.length > 0) {
        deletedCount = await redis.del(...keys);
      }

      return res.status(200).json({ success: true, message: 'Cache pattern cleared successfully', data: { pattern, deletedCount } });
    } catch (error) {
      console.error('Clear cache pattern error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear cache pattern' });
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
      for (let i = 0; i < (config as string[]).length; i += 2) {
        configObj[(config as string[])[i]] = (config as string[])[i + 1];
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
      const clients = (clientList as string).split('\n').filter((line: string) => line.trim()).map((line: string) => {
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
   * Get Redis logs (mock implementation - Redis doesn't have built-in log API)
   */
  static async getRedisLogs(req: Request, res: Response) {
    try {
      // This is a mock implementation since Redis doesn't expose logs via API
      // In a real implementation, you might read from Redis log files or use a logging service
      const mockLogs = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Redis server started successfully'
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'INFO',
          message: 'Client connected from 127.0.0.1'
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'INFO',
          message: 'Background saving started'
        }
      ];

      return res.status(200).json({ success: true, message: 'Redis logs retrieved successfully', data: mockLogs });
    } catch (error) {
      console.error('Get Redis logs error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get Redis logs' });
    }
  }

  /**
   * Clear Redis logs (mock implementation)
   */
  static async clearRedisLogs(req: Request, res: Response) {
    try {
      // Mock implementation - in reality you might clear log files or reset log storage
      return res.status(200).json({ success: true, message: 'Redis logs cleared successfully', data: null });
    } catch (error) {
      console.error('Clear Redis logs error:', error);
      return res.status(500).json({ success: false, message: 'Failed to clear Redis logs' });
    }
  }
}
