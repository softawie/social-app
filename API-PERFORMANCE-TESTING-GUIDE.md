# API Performance Testing Guide

## 🚀 Complete Redis Performance Testing Suite

I've created a comprehensive testing system to measure your API performance with and without Redis. Here's everything you need to know:

## 📋 What's Been Implemented

### 1. **Redis Toggle System**
- **File**: `/src/utils/redis-toggle.utils.ts`
- **Purpose**: Dynamically enable/disable Redis without restarting the server
- **Features**: Runtime toggling, performance measurement, status checking

### 2. **Performance Testing Scripts**
- **Simple Test**: `/scripts/simple-performance-test.js` (Recommended)
- **Full Test**: `/scripts/api-performance-test.js` (Comprehensive)
- **Both**: Measure response times with and without Redis

### 3. **API Endpoints for Testing**
- `POST /api/redis/toggle` - Enable/disable Redis
- `GET /api/redis/status` - Check Redis status
- `POST /api/redis/performance-test` - Run performance tests

## 🎯 How to Run Performance Tests

### Option 1: Quick Test (Recommended)
```bash
npm run test-performance
# or
npm run perf-test
```

### Option 2: Comprehensive Test
```bash
npm run test-performance-full
```

### Option 3: Manual API Testing
```bash
# Check Redis status
curl -X GET http://localhost:3000/api/redis/status

# Disable Redis
curl -X POST http://localhost:3000/api/redis/toggle \
  -H "Content-Type: application/json" \
  -d '{"enable": false}'

# Test your login endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Re-enable Redis
curl -X POST http://localhost:3000/api/redis/toggle \
  -H "Content-Type: application/json" \
  -d '{"enable": true}'
```

## 📊 Test Results Format

The performance tests will show results like this:

```
┌─────────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ Endpoint                │ With Redis  │ Without     │ Difference  │ % Change    │
│                         │ (ms)        │ Redis (ms)  │ (ms)        │             │
├─────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Login                   │          75 │         230 │         155 │        67.4% │
│ Get Users (Public)      │          45 │         120 │          75 │        62.5% │
│ Get Posts (Public)      │          35 │          85 │          50 │        58.8% │
│ Health Check            │          15 │          18 │           3 │        16.7% │
└─────────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

🎯 OVERALL PERFORMANCE:
   Average with Redis:    42ms
   Average without Redis: 113ms
   Average improvement:   71ms (62.8% faster)

✅ Redis is providing significant performance benefits!
```

## 🔍 Key Endpoints to Test

### Authentication Endpoints
- `POST /auth/login` - **Most Important** (should show biggest improvement)
- `POST /auth/signup`
- `POST /auth/refresh-token`
- `POST /auth/logout`

### User Endpoints
- `GET /getUsers` - Public endpoint with caching
- `GET /getSingleUser` - User-specific caching

### Post Endpoints
- `GET /api/posts` - List posts with caching
- `POST /api/posts` - Create post (cache invalidation)
- `GET /api/posts/:id` - Single post caching

### Other Cached Endpoints
- `GET /api/comments`
- `GET /api/friend-requests`
- `GET /health` - Basic health check

## 📈 Expected Performance Improvements

Based on your Redis implementation, you should see:

| Endpoint Type | Expected Improvement | Why |
|---------------|---------------------|-----|
| **Login (Cached User)** | **150-180ms faster** | User credential caching |
| **Login (First Time)** | **30-80ms faster** | Database index + projection |
| **Get Users** | **50-100ms faster** | Full response caching |
| **Get Posts** | **40-80ms faster** | Query result caching |
| **User Profile** | **30-60ms faster** | User-specific caching |
| **Health Check** | **5-15ms faster** | Minimal caching benefit |

## 🛠️ Troubleshooting

### If Redis Toggle Doesn't Work
1. **Check Authentication**: Make sure you're logged in as admin
2. **Manual Method**: Set environment variable `DISABLE_REDIS=true` and restart server
3. **Check Logs**: Look for Redis toggle messages in server logs

### If Tests Show No Improvement
1. **Check Cache Hit Rate**: `GET /api/redis/stats`
2. **Verify Caching**: Look for cache keys with `GET /api/redis/keys`
3. **Check Database Indexes**: Run the index creation script
4. **Test Multiple Times**: Run tests several times for accurate averages

### Common Issues
- **First Request Slow**: Cache warming - second request should be faster
- **No Cache Hits**: Check if endpoints have caching middleware
- **Authentication Errors**: Some endpoints require valid JWT tokens

## 📝 Manual Testing Steps

1. **Start Your Server**
   ```bash
   npm start
   ```

2. **Test Login Performance**
   ```bash
   # Test with Redis enabled (default)
   time curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   
   # Disable Redis
   curl -X POST http://localhost:3000/api/redis/toggle \
     -H "Content-Type: application/json" \
     -d '{"enable": false}'
   
   # Test without Redis
   time curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "password": "password123"}'
   
   # Re-enable Redis
   curl -X POST http://localhost:3000/api/redis/toggle \
     -H "Content-Type: application/json" \
     -d '{"enable": true}'
   ```

3. **Check Redis Statistics**
   ```bash
   curl -X GET http://localhost:3000/api/redis/stats
   ```

## 🎯 What to Look For

### Good Redis Performance Signs
- **Login**: 50-80ms with Redis, 150-230ms without
- **Cache Hit Rate**: >70% for frequently accessed endpoints
- **Consistent Performance**: Similar response times for repeated requests
- **Memory Usage**: Reasonable Redis memory consumption

### Performance Issues Signs
- **No Difference**: Check if caching is properly implemented
- **Slower with Redis**: Possible network latency or over-caching
- **High Memory Usage**: Too much data being cached

## 📊 Monitoring Redis Performance

### Real-time Monitoring
```bash
# Check cache statistics
curl -X GET http://localhost:3000/api/redis/cache-stats

# View cache keys
curl -X GET http://localhost:3000/api/redis/keys?detailed=true

# Check memory usage
curl -X GET http://localhost:3000/api/redis/memory
```

### Performance Logs
Your login function now automatically logs performance:
```
Cache HIT for user: test@example.com
Login completed in 75ms for user: test@example.com (Cache: HIT)

Cache MISS for user: newuser@example.com - querying database
Login completed in 180ms for user: newuser@example.com (Cache: MISS)
```

## 🚀 Next Steps

1. **Run the Tests**: Start with `npm run test-performance`
2. **Analyze Results**: Look for significant improvements in cached endpoints
3. **Optimize Further**: Focus on endpoints with poor cache hit rates
4. **Monitor Production**: Use Redis stats to track real-world performance

The testing suite will give you concrete numbers showing how much Redis is improving your API performance!
