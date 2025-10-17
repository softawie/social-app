import { redisService } from './redis.service';
import { nanoid } from 'nanoid';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

export interface ActiveSession {
  sessionId: string;
  data: SessionData;
}

export class SessionService {
  private static readonly SESSION_PREFIX = 'session';
  private static readonly USER_SESSIONS_PREFIX = 'user_sessions';
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Create a new session with optimized Redis pipeline operations
   */
  static async createSession(
    userId: string, 
    sessionData: Omit<SessionData, 'userId' | 'loginTime' | 'lastActivity'>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<string> {
    const sessionId = nanoid(32);
    const now = new Date();

    const fullSessionData: SessionData = {
      ...sessionData,
      userId,
      loginTime: now,
      lastActivity: now
    };

    // Use Redis pipeline for better performance - execute all operations atomically
    const pipeline = redisService.redis.pipeline();
    
    // Store session data
    pipeline.setex(
      `${this.SESSION_PREFIX}:${sessionId}`, 
      ttl, 
      JSON.stringify(fullSessionData)
    );

    // Add session to user's active sessions
    pipeline.sadd(
      `${this.USER_SESSIONS_PREFIX}:${userId}`,
      sessionId
    );

    // Set expiration for user sessions set
    pipeline.expire(`${this.USER_SESSIONS_PREFIX}:${userId}`, ttl);

    // Execute all operations in a single round trip
    await pipeline.exec();

    return sessionId;
  }

  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<SessionData | null> {
    return await redisService.get<SessionData>(
      sessionId, 
      { prefix: this.SESSION_PREFIX }
    );
  }

  /**
   * Update session activity
   */
  static async updateActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date();
      await redisService.set(
        sessionId,
        session,
        { prefix: this.SESSION_PREFIX, ttl: this.DEFAULT_TTL }
      );
    }
  }

  /**
   * Destroy a specific session
   */
  static async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Remove from user's active sessions
      await redisService.redis.srem(
        `${this.USER_SESSIONS_PREFIX}:${session.userId}`,
        sessionId
      );
    }

    // Remove session data
    await redisService.del(sessionId, this.SESSION_PREFIX);
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<ActiveSession[]> {
    const sessionIds = await redisService.smembers<string>(
      userId,
      { prefix: this.USER_SESSIONS_PREFIX, serialize: false }
    );

    const sessions: ActiveSession[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.getSession(sessionId);
      if (sessionData) {
        sessions.push({ sessionId, data: sessionData });
      } else {
        // Clean up invalid session ID
        await redisService.redis.srem(
          `${this.USER_SESSIONS_PREFIX}:${userId}`,
          sessionId
        );
      }
    }

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   */
  static async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await redisService.smembers<string>(
      userId,
      { prefix: this.USER_SESSIONS_PREFIX, serialize: false }
    );

    // Remove all session data
    for (const sessionId of sessionIds) {
      await redisService.del(sessionId, this.SESSION_PREFIX);
    }

    // Clear user sessions set
    await redisService.del(userId, this.USER_SESSIONS_PREFIX);
  }

  /**
   * Destroy all sessions except current one
   */
  static async destroyOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const sessionIds = await redisService.smembers<string>(
      userId,
      { prefix: this.USER_SESSIONS_PREFIX, serialize: false }
    );

    // Remove all sessions except current
    for (const sessionId of sessionIds) {
      if (sessionId !== currentSessionId) {
        await redisService.del(sessionId, this.SESSION_PREFIX);
        await redisService.redis.srem(
          `${this.USER_SESSIONS_PREFIX}:${userId}`,
          sessionId
        );
      }
    }
  }

  /**
   * Clean up expired sessions for a user
   */
  static async cleanupExpiredSessions(userId: string): Promise<void> {
    const sessionIds = await redisService.smembers<string>(
      userId,
      { prefix: this.USER_SESSIONS_PREFIX, serialize: false }
    );

    for (const sessionId of sessionIds) {
      const exists = await redisService.exists(sessionId, this.SESSION_PREFIX);
      if (!exists) {
        // Remove expired session from user's set
        await redisService.redis.srem(
          `${this.USER_SESSIONS_PREFIX}:${userId}`,
          sessionId
        );
      }
    }
  }

  /**
   * Get session statistics for a user
   */
  static async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    lastActivity: Date | null;
  }> {
    const sessions = await this.getUserSessions(userId);
    
    let lastActivity: Date | null = null;
    if (sessions.length > 0) {
      lastActivity = sessions.reduce((latest, session) => {
        const sessionActivity = new Date(session.data.lastActivity);
        return !latest || sessionActivity > latest ? sessionActivity : latest;
      }, null as Date | null);
    }

    return {
      totalSessions: sessions.length,
      activeSessions: sessions.length, // All returned sessions are active
      lastActivity
    };
  }

  /**
   * Extend session TTL
   */
  static async extendSession(sessionId: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    await redisService.expire(sessionId, ttl, this.SESSION_PREFIX);
  }

  /**
   * Check if session exists and is valid
   */
  static async isValidSession(sessionId: string): Promise<boolean> {
    return await redisService.exists(sessionId, this.SESSION_PREFIX);
  }

  /**
   * Get device info from user agent
   */
  static parseUserAgent(userAgent: string): SessionData['deviceInfo'] {
    // Simple user agent parsing (you might want to use a library like 'ua-parser-js')
    const deviceInfo: SessionData['deviceInfo'] = {};

    if (userAgent.includes('Chrome')) deviceInfo.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) deviceInfo.browser = 'Firefox';
    else if (userAgent.includes('Safari')) deviceInfo.browser = 'Safari';
    else if (userAgent.includes('Edge')) deviceInfo.browser = 'Edge';

    if (userAgent.includes('Windows')) deviceInfo.os = 'Windows';
    else if (userAgent.includes('Mac')) deviceInfo.os = 'macOS';
    else if (userAgent.includes('Linux')) deviceInfo.os = 'Linux';
    else if (userAgent.includes('Android')) deviceInfo.os = 'Android';
    else if (userAgent.includes('iOS')) deviceInfo.os = 'iOS';

    if (userAgent.includes('Mobile')) deviceInfo.device = 'Mobile';
    else if (userAgent.includes('Tablet')) deviceInfo.device = 'Tablet';
    else deviceInfo.device = 'Desktop';

    return deviceInfo;
  }
}
