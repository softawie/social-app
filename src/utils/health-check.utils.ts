import { RedisConnection } from '@db/redis.connection';
import mongoose from 'mongoose';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export class HealthCheckService {
  /**
   * Perform comprehensive health check
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    // Check database
    const dbHealth = await this.checkDatabase();
    
    // Check Redis
    const redisHealth = await this.checkRedis();
    
    // Check memory usage
    const memoryHealth = this.checkMemory();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (dbHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (redisHealth.status === 'unhealthy') {
      overallStatus = 'degraded'; // Redis failure is not critical
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        memory: memoryHealth
      }
    };
  }

  /**
   * Check MongoDB connection
   */
  private static async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number }> {
    try {
      const start = Date.now();
      
      // Simple ping to check connection
      await mongoose.connection.db?.admin().ping();
      
      const responseTime = Date.now() - start;
      
      return {
        status: 'healthy',
        responseTime
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'unhealthy'
      };
    }
  }

  /**
   * Check Redis connection
   */
  private static async checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number }> {
    try {
      const healthCheck = await RedisConnection.healthCheck();
      
      return {
        status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
        responseTime: healthCheck.latency
      };
    } catch (error) {
      console.error('Redis health check failed:', error);
      return {
        status: 'unhealthy'
      };
    }
  }

  /**
   * Check memory usage
   */
  private static checkMemory(): { used: number; total: number; percentage: number } {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const percentage = Math.round((usedMemory / totalMemory) * 100);
    
    return {
      used: usedMemory,
      total: totalMemory,
      percentage
    };
  }

  /**
   * Simple health check for load balancers
   */
  static async isHealthy(): Promise<boolean> {
    try {
      // Check if database is connected
      if (mongoose.connection.readyState !== 1) {
        return false;
      }
      
      // Quick database ping
      await mongoose.connection.db?.admin().ping();
      
      return true;
    } catch (error) {
      return false;
    }
  }
}
