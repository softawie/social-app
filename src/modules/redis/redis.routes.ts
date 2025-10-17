import { Router } from 'express';
import { RedisController } from './redis.controller';
import { authenticationMiddleware } from '@src/MiddleWares/auth.middleware';
import { rateLimiters, bypassRateLimit } from '@src/MiddleWares/redis-rate-limit.middleware';
import { quickCache } from '@src/MiddleWares/universal-cache.middleware';

const router = Router();

// All Redis routes require authentication and admin privileges
router.use(authenticationMiddleware);

// Redis information and statistics - with bypass rate limiting for admins
router.get('/info', bypassRateLimit, quickCache.realtime(), RedisController.getRedisInfo);
router.get('/stats', bypassRateLimit, quickCache.realtime(), RedisController.getRedisStats);
router.get('/memory', bypassRateLimit, quickCache.realtime(), RedisController.getMemoryUsage);
router.get('/keyspace', bypassRateLimit, quickCache.realtime(), RedisController.getKeyspaceInfo);
router.get('/config', bypassRateLimit, quickCache.static(), RedisController.getRedisConfig);
router.get('/clients', bypassRateLimit, quickCache.realtime(), RedisController.getRedisClients);

// Cache management - no caching for cache management operations
router.get('/keys', bypassRateLimit, RedisController.getCacheKeys);
router.get('/key/:key', bypassRateLimit, RedisController.getCacheKeyInfo);
router.put('/key/ttl', bypassRateLimit, RedisController.setCacheKeyTTL);
router.get('/get', bypassRateLimit, RedisController.getCacheValue);

// Enhanced cache clearing operations
router.delete('/clear-pattern', bypassRateLimit, RedisController.clearCachePattern);
router.delete('/clear-all', bypassRateLimit, RedisController.clearAllCache);
router.delete('/clear-entity', bypassRateLimit, RedisController.clearEntityCache);
router.delete('/delete', bypassRateLimit, RedisController.deleteCacheKey);
router.delete('/flush-all', bypassRateLimit, RedisController.flushAll);

// Cache statistics
router.get('/cache-stats', bypassRateLimit, quickCache.realtime(), RedisController.getCacheStats);

// Redis logs (real implementation) - no caching for real-time logs
router.get('/logs', bypassRateLimit, RedisController.getRedisLogs);
router.delete('/logs/clear', bypassRateLimit, RedisController.clearRedisLogs);

export default router;
