import { RedisConnection } from '@db/redis.connection';

export interface RedisLogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  operation?: string;
  key?: string;
  data?: any;
  metadata?: Record<string, any>;
}

export class RedisLogger {
  private static readonly LOG_KEY = 'redis:logs';
  private static readonly MAX_LOGS = 1000; // Keep last 1000 logs

  /**
   * Log a Redis operation
   */
  static async log(entry: Omit<RedisLogEntry, 'timestamp'>): Promise<void> {
    try {
      const redis = RedisConnection.getInstance();
      
      const logEntry: RedisLogEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      };

      // Add to Redis list (LPUSH adds to the beginning)
      await redis.lpush(this.LOG_KEY, JSON.stringify(logEntry));
      
      // Trim to keep only the last MAX_LOGS entries
      await redis.ltrim(this.LOG_KEY, 0, this.MAX_LOGS - 1);
      
      // Set expiration for the logs list (7 days)
      await redis.expire(this.LOG_KEY, 7 * 24 * 60 * 60);
      
    } catch (error) {
      // Fallback to console if Redis logging fails
      console.error('Redis logging failed:', error);
      console.log(`[Redis ${entry.level}] ${entry.message}`);
    }
  }

  /**
   * Log cache hit
   */
  static async logCacheHit(key: string, data?: any): Promise<void> {
    await this.log({
      level: 'INFO',
      message: `Cache HIT: ${key}`,
      operation: 'CACHE_HIT',
      key,
      data: data ? (typeof data === 'object' ? JSON.stringify(data).substring(0, 200) + '...' : data) : undefined
    });
  }

  /**
   * Log cache miss
   */
  static async logCacheMiss(key: string): Promise<void> {
    await this.log({
      level: 'INFO',
      message: `Cache MISS: ${key}`,
      operation: 'CACHE_MISS',
      key
    });
  }

  /**
   * Log cache set operation
   */
  static async logCacheSet(key: string, ttl?: number): Promise<void> {
    await this.log({
      level: 'INFO',
      message: `Cache SET: ${key}${ttl ? ` (TTL: ${ttl}s)` : ''}`,
      operation: 'CACHE_SET',
      key,
      metadata: { ttl }
    });
  }

  /**
   * Log cache delete operation
   */
  static async logCacheDelete(key: string): Promise<void> {
    await this.log({
      level: 'INFO',
      message: `Cache DELETE: ${key}`,
      operation: 'CACHE_DELETE',
      key
    });
  }

  /**
   * Log cache clear pattern operation
   */
  static async logCacheClear(pattern: string, deletedCount: number): Promise<void> {
    await this.log({
      level: 'WARN',
      message: `Cache CLEAR: ${pattern} (${deletedCount} keys deleted)`,
      operation: 'CACHE_CLEAR',
      key: pattern,
      metadata: { deletedCount }
    });
  }

  /**
   * Log Redis connection events
   */
  static async logConnection(event: 'CONNECT' | 'DISCONNECT' | 'ERROR', message: string): Promise<void> {
    await this.log({
      level: event === 'ERROR' ? 'ERROR' : 'INFO',
      message: `Redis ${event}: ${message}`,
      operation: `REDIS_${event}`
    });
  }

  /**
   * Get all Redis logs
   */
  static async getLogs(limit: number = 100): Promise<RedisLogEntry[]> {
    try {
      const redis = RedisConnection.getInstance();
      
      // Get logs from Redis list (LRANGE gets from beginning)
      const logs = await redis.lrange(this.LOG_KEY, 0, limit - 1);
      
      return logs.map(log => {
        try {
          return JSON.parse(log);
        } catch (error) {
          // Handle malformed log entries
          return {
            timestamp: new Date().toISOString(),
            level: 'ERROR' as const,
            message: `Malformed log entry: ${log}`,
            operation: 'LOG_ERROR'
          };
        }
      });
      
    } catch (error) {
      console.error('Failed to get Redis logs:', error);
      return [];
    }
  }

  /**
   * Clear all Redis logs
   */
  static async clearLogs(): Promise<number> {
    try {
      const redis = RedisConnection.getInstance();
      const deleted = await redis.del(this.LOG_KEY);
      
      await this.log({
        level: 'WARN',
        message: 'Redis logs cleared',
        operation: 'LOGS_CLEARED'
      });
      
      return deleted;
    } catch (error) {
      console.error('Failed to clear Redis logs:', error);
      return 0;
    }
  }

  /**
   * Get logs by operation type
   */
  static async getLogsByOperation(operation: string, limit: number = 50): Promise<RedisLogEntry[]> {
    const allLogs = await this.getLogs(500); // Get more logs to filter
    return allLogs
      .filter(log => log.operation === operation)
      .slice(0, limit);
  }

  /**
   * Get logs by level
   */
  static async getLogsByLevel(level: RedisLogEntry['level'], limit: number = 50): Promise<RedisLogEntry[]> {
    const allLogs = await this.getLogs(500); // Get more logs to filter
    return allLogs
      .filter(log => log.level === level)
      .slice(0, limit);
  }
}
