import { RedisConnection } from '@db/redis.connection';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  serialize?: boolean;
}

export class RedisService {
  public redis: Redis;
  private defaultTTL: number = 3600; // 1 hour default

  constructor() {
    this.redis = RedisConnection.getInstance();
  }

  /**
   * Set a value in Redis with optional TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = this.defaultTTL, prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const serializedValue = serialize ? JSON.stringify(value) : value;

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }
    } catch (error) {
      console.error('Redis SET error:', error);
      // Don't throw error to prevent cache failures from breaking the app
    }
  }

  /**
   * Get a value from Redis
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const value = await this.redis.get(fullKey);

      if (value === null) return null;
      
      return serialize ? JSON.parse(value) : (value as T);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Delete a key from Redis
   */
  async del(key: string, prefix: string = ''): Promise<void> {
    try {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      await this.redis.del(fullKey);
    } catch (error) {
      console.error('Redis DEL error:', error);
    }
  }

  /**
   * Delete multiple keys matching a pattern (using SCAN for better performance)
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let deletedCount = 0;
      
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        
        if (keys.length > 0) {
          const deleted = await this.redis.del(...keys);
          deletedCount += deleted;
        }
      } while (cursor !== '0');
      
      return deletedCount;
    } catch (error) {
      console.error('Redis DEL pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string, prefix: string = ''): Promise<boolean> {
    try {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  }

  /**
   * Increment a counter
   */
  async incr(key: string, prefix: string = ''): Promise<number> {
    try {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      return await this.redis.incr(fullKey);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return 0;
    }
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number, prefix: string = ''): Promise<void> {
    try {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      await this.redis.expire(fullKey, ttl);
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T = any>(keys: string[], options: CacheOptions = {}): Promise<(T | null)[]> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKeys = keys.map(key => prefix ? `${prefix}:${key}` : key);
      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
        if (value === null) return null;
        return serialize ? JSON.parse(value) : value;
      });
    } catch (error) {
      console.error('Redis MGET error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<void> {
    try {
      const { prefix = '', serialize = true } = options;
      const pairs: string[] = [];

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}:${key}` : key;
        const serializedValue = serialize ? JSON.stringify(value) : value;
        pairs.push(fullKey, serializedValue);
      });

      await this.redis.mset(...pairs);
    } catch (error) {
      console.error('Redis MSET error:', error);
    }
  }

  /**
   * Add item to a list (left push)
   */
  async lpush(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const serializedValue = serialize ? JSON.stringify(value) : value;
      await this.redis.lpush(fullKey, serializedValue);
    } catch (error) {
      console.error('Redis LPUSH error:', error);
    }
  }

  /**
   * Get list items with range
   */
  async lrange<T = any>(key: string, start: number = 0, end: number = -1, options: CacheOptions = {}): Promise<T[]> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const values = await this.redis.lrange(fullKey, start, end);

      return values.map(value => serialize ? JSON.parse(value) : value);
    } catch (error) {
      console.error('Redis LRANGE error:', error);
      return [];
    }
  }

  /**
   * Add item to a set
   */
  async sadd(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const serializedValue = serialize ? JSON.stringify(value) : value;
      await this.redis.sadd(fullKey, serializedValue);
    } catch (error) {
      console.error('Redis SADD error:', error);
    }
  }

  /**
   * Get all members of a set
   */
  async smembers<T = any>(key: string, options: CacheOptions = {}): Promise<T[]> {
    try {
      const { prefix = '', serialize = true } = options;
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const values = await this.redis.smembers(fullKey);

      return values.map(value => serialize ? JSON.parse(value) : value);
    } catch (error) {
      console.error('Redis SMEMBERS error:', error);
      return [];
    }
  }

  /**
   * Cache with fallback function
   */
  async cacheWithFallback<T>(
    key: string,
    fallbackFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute fallback function
    const result = await fallbackFn();
    
    // Cache the result
    await this.set(key, result, options);
    
    return result;
  }

  /**
   * Invalidate cache patterns for a specific entity
   */
  async invalidateEntity(entityType: string, entityId: string): Promise<number> {
    const patterns = [
      `${entityType}:${entityId}`,
      `${entityType}:${entityId}:*`,
      `*:${entityType}:${entityId}`,
      `*:${entityType}:${entityId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.delPattern(pattern);
    }
    return totalDeleted;
  }

  /**
   * Get Redis memory usage info
   */
  async getMemoryInfo(): Promise<Record<string, any>> {
    try {
      const info = await this.redis.info('memory');
      const parsedInfo: Record<string, any> = {};
      
      info.split('\r\n').forEach(line => {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          parsedInfo[key] = value;
        }
      });
      
      return parsedInfo;
    } catch (error) {
      console.error('Redis memory info error:', error);
      return {};
    }
  }

  /**
   * Get all keys matching pattern with SCAN (memory efficient)
   */
  async scanKeys(pattern: string = '*', count: number = 100): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = '0';
      
      do {
        const [nextCursor, batchKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        cursor = nextCursor;
        keys.push(...batchKeys);
      } while (cursor !== '0');
      
      return keys;
    } catch (error) {
      console.error('Redis scan keys error:', error);
      return [];
    }
  }

  /**
   * Bulk operations with pipeline for better performance
   */
  async bulkSet(keyValuePairs: Record<string, any>, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = this.defaultTTL, prefix = '', serialize = true } = options;
      const pipeline = this.redis.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}:${key}` : key;
        const serializedValue = serialize ? JSON.stringify(value) : value;
        
        if (ttl > 0) {
          pipeline.setex(fullKey, ttl, serializedValue);
        } else {
          pipeline.set(fullKey, serializedValue);
        }
      });
      
      await pipeline.exec();
    } catch (error) {
      console.error('Redis bulk set error:', error);
    }
  }

  /**
   * Atomic increment with expiration
   */
  async incrWithExpire(key: string, ttl: number, prefix: string = ''): Promise<number> {
    try {
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const pipeline = this.redis.pipeline();
      
      pipeline.incr(fullKey);
      pipeline.expire(fullKey, ttl);
      
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error('Redis incr with expire error:', error);
      return 0;
    }
  }

  /**
   * Get Redis database size
   */
  async getDbSize(): Promise<number> {
    try {
      return await this.redis.dbsize();
    } catch (error) {
      console.error('Redis dbsize error:', error);
      return 0;
    }
  }

  /**
   * Flush current database
   */
  async flushDb(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('Redis flushdb error:', error);
    }
  }

  /**
   * Flush all databases
   */
  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      console.error('Redis flushall error:', error);
    }
  }
}

// Export singleton instance
export const redisService = new RedisService();
