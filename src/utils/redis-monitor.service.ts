import { RedisConnection } from '@db/redis.connection';
import { redisService } from './redis.service';

export interface RedisMetrics {
  memory: {
    used: string;
    peak: string;
    fragmentation: number;
    maxMemory: string;
    evictionPolicy: string;
  };
  keys: {
    total: number;
    expired: number;
    evicted: number;
  };
  performance: {
    hitRate: number;
    opsPerSecond: number;
    latency: number;
  };
  clients: {
    connected: number;
    blocked: number;
  };
  persistence: {
    lastSave: string;
    aofSize: string;
    rdbSize: string;
  };
}

export class RedisMonitorService {
  private static readonly ALERT_THRESHOLDS = {
    memoryUsage: 80, // 80% of max memory
    hitRate: 50, // 50% hit rate
    latency: 100, // 100ms latency
    fragmentation: 1.5 // 1.5x fragmentation ratio
  };

  /**
   * Get comprehensive Redis metrics
   */
  static async getMetrics(): Promise<RedisMetrics> {
    try {
      const redis = RedisConnection.getInstance();
      
      // Get all Redis info sections
      const [memoryInfo, statsInfo, clientsInfo, persistenceInfo] = await Promise.all([
        redis.info('memory'),
        redis.info('stats'),
        redis.info('clients'),
        redis.info('persistence')
      ]);

      // Parse memory info
      const memory = this.parseMemoryInfo(memoryInfo);
      
      // Parse stats info
      const stats = this.parseStatsInfo(statsInfo);
      
      // Parse clients info
      const clients = this.parseClientsInfo(clientsInfo);
      
      // Parse persistence info
      const persistence = this.parsePersistenceInfo(persistenceInfo);
      
      // Get key metrics
      const keys = await this.getKeyMetrics();
      
      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(stats);

      return {
        memory,
        keys,
        performance,
        clients,
        persistence
      };
    } catch (error) {
      console.error('Failed to get Redis metrics:', error);
      throw error;
    }
  }

  /**
   * Parse memory information
   */
  private static parseMemoryInfo(memoryInfo: string): RedisMetrics['memory'] {
    const lines = memoryInfo.split('\r\n');
    const info: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        info[key] = value;
      }
    });

    return {
      used: info.used_memory_human || '0B',
      peak: info.used_memory_peak_human || '0B',
      fragmentation: parseFloat(info.mem_fragmentation_ratio || '0'),
      maxMemory: info.maxmemory_human || '0B',
      evictionPolicy: info.maxmemory_policy || 'noeviction'
    };
  }

  /**
   * Parse stats information
   */
  private static parseStatsInfo(statsInfo: string): Record<string, number> {
    const lines = statsInfo.split('\r\n');
    const stats: Record<string, number> = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = parseInt(value) || 0;
      }
    });

    return stats;
  }

  /**
   * Parse clients information
   */
  private static parseClientsInfo(clientsInfo: string): RedisMetrics['clients'] {
    const lines = clientsInfo.split('\r\n');
    const clients: Record<string, number> = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        clients[key] = parseInt(value) || 0;
      }
    });

    return {
      connected: clients.connected_clients || 0,
      blocked: clients.blocked_clients || 0
    };
  }

  /**
   * Parse persistence information
   */
  private static parsePersistenceInfo(persistenceInfo: string): RedisMetrics['persistence'] {
    const lines = persistenceInfo.split('\r\n');
    const persistence: Record<string, string> = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        persistence[key] = value;
      }
    });

    return {
      lastSave: persistence.rdb_last_save_time || 'Unknown',
      aofSize: persistence.aof_current_size_human || '0B',
      rdbSize: persistence.rdb_current_bgsave_time_sec || '0B'
    };
  }

  /**
   * Get key metrics
   */
  private static async getKeyMetrics(): Promise<RedisMetrics['keys']> {
    try {
      const redis = RedisConnection.getInstance();
      const dbSize = await redis.dbsize();
      
      // Get expired and evicted keys from stats
      const statsInfo = await redis.info('stats');
      const lines = statsInfo.split('\r\n');
      let expired = 0;
      let evicted = 0;
      
      lines.forEach(line => {
        if (line && !line.startsWith('#') && line.includes(':')) {
          const [key, value] = line.split(':');
          if (key === 'expired_keys') expired = parseInt(value) || 0;
          if (key === 'evicted_keys') evicted = parseInt(value) || 0;
        }
      });

      return {
        total: dbSize,
        expired,
        evicted
      };
    } catch (error) {
      console.error('Failed to get key metrics:', error);
      return { total: 0, expired: 0, evicted: 0 };
    }
  }

  /**
   * Calculate performance metrics
   */
  private static calculatePerformanceMetrics(stats: Record<string, number>): RedisMetrics['performance'] {
    const hits = stats.keyspace_hits || 0;
    const misses = stats.keyspace_misses || 0;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    const opsPerSecond = stats.instantaneous_ops_per_sec || 0;
    
    // Calculate average latency (simplified)
    const latency = stats.avg_latency || 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100,
      opsPerSecond,
      latency
    };
  }

  /**
   * Check for alerts
   */
  static async checkAlerts(): Promise<string[]> {
    const alerts: string[] = [];
    const metrics = await this.getMetrics();

    // Memory usage alert
    const maxMemoryBytes = this.parseMemoryBytes(metrics.memory.maxMemory);
    const usedMemoryBytes = this.parseMemoryBytes(metrics.memory.used);
    const memoryUsagePercent = (usedMemoryBytes / maxMemoryBytes) * 100;
    
    if (memoryUsagePercent > this.ALERT_THRESHOLDS.memoryUsage) {
      alerts.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
    }

    // Hit rate alert
    if (metrics.performance.hitRate < this.ALERT_THRESHOLDS.hitRate) {
      alerts.push(`Low hit rate: ${metrics.performance.hitRate}%`);
    }

    // Latency alert
    if (metrics.performance.latency > this.ALERT_THRESHOLDS.latency) {
      alerts.push(`High latency: ${metrics.performance.latency}ms`);
    }

    // Fragmentation alert
    if (metrics.memory.fragmentation > this.ALERT_THRESHOLDS.fragmentation) {
      alerts.push(`High fragmentation: ${metrics.memory.fragmentation}x`);
    }

    return alerts;
  }

  /**
   * Parse memory string to bytes
   */
  private static parseMemoryBytes(memoryStr: string): number {
    const units: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024
    };

    const match = memoryStr.match(/^(\d+(?:\.\d+)?)\s*([A-Z]+)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2];
    
    return value * (units[unit] || 1);
  }

  /**
   * Get cache statistics by prefix
   */
  static async getCacheStats(): Promise<Record<string, number>> {
    const prefixes = ['session', 'user', 'api', 'rate_limit', 'temp', 'otp', 'posts', 'comments'];
    const stats: Record<string, number> = {};

    for (const prefix of prefixes) {
      try {
        const keys = await redisService.scanKeys(`${prefix}:*`);
        stats[prefix] = keys.length;
      } catch (error) {
        console.error(`Failed to get stats for prefix ${prefix}:`, error);
        stats[prefix] = 0;
      }
    }

    return stats;
  }

  /**
   * Get top memory consuming keys
   */
  static async getTopMemoryKeys(limit: number = 10): Promise<Array<{ key: string; size: number; sizeFormatted: string }>> {
    try {
      const redis = RedisConnection.getInstance();
      const keys = await redisService.scanKeys('*');
      
      const keySizes = await Promise.all(
        keys.slice(0, 100).map(async (key) => {
          try {
            const size = await redis.memory('USAGE', key);
            return { key, size: size || 0 };
          } catch (error) {
            return { key, size: 0 };
          }
        })
      );

      return keySizes
        .sort((a, b) => b.size - a.size)
        .slice(0, limit)
        .map(({ key, size }) => ({
          key,
          size,
          sizeFormatted: `${(size / 1024).toFixed(2)} KB`
        }));
    } catch (error) {
      console.error('Failed to get top memory keys:', error);
      return [];
    }
  }

  /**
   * Generate health report
   */
  static async generateHealthReport(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    metrics: RedisMetrics;
    alerts: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getMetrics();
    const alerts = await this.checkAlerts();
    const recommendations: string[] = [];

    // Determine status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (alerts.length > 0) {
      status = alerts.some(alert => 
        alert.includes('High memory usage') || 
        alert.includes('High latency')
      ) ? 'critical' : 'warning';
    }

    // Generate recommendations
    if (metrics.performance.hitRate < 70) {
      recommendations.push('Consider increasing cache TTL or optimizing cache keys');
    }
    
    if (metrics.memory.fragmentation > 1.3) {
      recommendations.push('Consider running MEMORY PURGE to reduce fragmentation');
    }
    
    if (metrics.keys.total > 100000) {
      recommendations.push('Consider implementing key expiration policies');
    }

    return {
      status,
      metrics,
      alerts,
      recommendations
    };
  }
}
