import Redis from 'ioredis';
import { AppException } from '@src/exceptions/app.exception';

export class RedisConnection {
  private static instance: Redis | null = null;
  private static isConnected: boolean = false;

  /**
   * Get Redis instance (singleton pattern)
   */
  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = this.createConnection();
    }
    return this.instance;
  }

  /**
   * Create Redis connection with enhanced configuration
   */
  private static createConnection(): Redis {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      
      // Enhanced connection settings
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      
      // Connection pool optimization
      family: 4, // Force IPv4
      enableReadyCheck: true,
      maxLoadingTimeout: 5000,
      
      // Reconnection strategy
      retryDelayOnClusterDown: 300,
      enableOfflineQueue: false,
      
      // Memory optimization
      compression: process.env.NODE_ENV === 'production' ? 'gzip' : undefined,
      
      // TLS support if enabled
      ...(process.env.REDIS_TLS === 'true' && {
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      })
    };

    const redis = new Redis(redisConfig);

    // Connection event handlers
    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
      this.isConnected = true;
    });

    redis.on('ready', () => {
      console.log('✅ Redis is ready to receive commands');
    });

    redis.on('error', (error) => {
      console.error('❌ Redis connection error:', error);
      this.isConnected = false;
    });

    redis.on('close', () => {
      console.log('⚠️ Redis connection closed');
      this.isConnected = false;
    });

    redis.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    return redis;
  }

  /**
   * Initialize Redis connection
   */
  static async connect(): Promise<void> {
    try {
      const redis = this.getInstance();
      await redis.connect();
      
      // Test connection
      await redis.ping();
      console.log('✅ Redis connection established and tested');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw new AppException('Redis connection failed', 500);
    }
  }

  /**
   * Close Redis connection
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
      this.isConnected = false;
      console.log('✅ Redis connection closed');
    }
  }

  /**
   * Check if Redis is connected
   */
  static isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Health check for Redis
   */
  static async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const redis = this.getInstance();
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy'
      };
    }
  }
}
