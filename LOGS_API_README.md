# 📊 Logs API Documentation

## Overview

This API provides comprehensive logging functionality for your Express.js application. It automatically captures all HTTP requests with detailed information and provides endpoints to retrieve, filter, and analyze logs.

## Features

- ✅ **Automatic Request Logging**: Captures all HTTP requests automatically
- ✅ **Structured JSON Format**: Logs stored in structured JSON format
- ✅ **Real-time Response Time Tracking**: Measures and logs response times
- ✅ **Comprehensive Filtering**: Filter by method, status, date range
- ✅ **Pagination Support**: Handle large log datasets efficiently
- ✅ **Statistics Dashboard**: Get insights about your API usage
- ✅ **Export Functionality**: Download logs as JSON files
- ✅ **Admin Controls**: Clear logs when needed

## Log Entry Format

Each log entry contains the following fields:

```json
{
  "id": 1,
  "timestamp": "2025-09-29T10:23:45.123Z",
  "method": "GET",
  "url": "/api/users",
  "status": 200,
  "responseTime": 45,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

## API Endpoints

### 1. Get Logs
**GET** `/api/logs`

Retrieve logs with optional filtering and pagination.

**Query Parameters:**
- `limit` (number, default: 50): Number of logs to return
- `offset` (number, default: 0): Number of logs to skip
- `method` (string): Filter by HTTP method (GET, POST, PUT, DELETE)
- `status` (number): Filter by HTTP status code
- `startDate` (ISO string): Filter logs from this date
- `endDate` (ISO string): Filter logs until this date

**Example Requests:**
```bash
# Get latest 10 logs
curl "http://localhost:3000/api/logs?limit=10"

# Get POST requests only
curl "http://localhost:3000/api/logs?method=POST"

# Get error responses (4xx, 5xx)
curl "http://localhost:3000/api/logs?status=404"

# Get logs with pagination
curl "http://localhost:3000/api/logs?limit=25&offset=50"
```

**Response:**
```json
{
  "message": "Logs retrieved successfully",
  "data": {
    "logs": [
      {
        "id": 1,
        "timestamp": "2025-09-29T10:23:45.123Z",
        "method": "GET",
        "url": "/api/users",
        "status": 200,
        "responseTime": 45,
        "ip": "192.168.1.100",
        "userAgent": "Mozilla/5.0..."
      }
    ],
    "total": 150,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

### 2. Get Statistics
**GET** `/api/logs/stats`

Get comprehensive statistics about your API usage.

**Response:**
```json
{
  "message": "Log statistics retrieved successfully",
  "data": {
    "total": 1250,
    "methods": {
      "GET": 800,
      "POST": 300,
      "PUT": 100,
      "DELETE": 50
    },
    "statusCodes": {
      "2xx": 1100,
      "3xx": 50,
      "4xx": 80,
      "5xx": 20
    },
    "averageResponseTime": 125,
    "totalRequests24h": 450,
    "errorRate": 8
  }
}
```

### 3. Export Logs
**GET** `/api/logs/export`

Download all logs as a JSON file.

**Response:** File download with filename `logs-YYYY-MM-DD.json`

### 4. Clear Logs
**DELETE** `/api/logs`

Clear all logs (use with caution).

**Response:**
```json
{
  "message": "All logs cleared successfully"
}
```

## Frontend Integration

### JavaScript/React Example

```javascript
// Fetch logs with filtering
async function fetchLogs(filters = {}) {
  const params = new URLSearchParams();
  
  if (filters.method) params.append('method', filters.method);
  if (filters.status) params.append('status', filters.status);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const response = await fetch(`/api/logs?${params}`);
  const data = await response.json();
  
  return data.data;
}

// Usage examples
const logs = await fetchLogs({ method: 'POST', limit: 20 });
const stats = await fetch('/api/logs/stats').then(r => r.json());
```

### Vue.js Example

```javascript
// In your Vue component
export default {
  data() {
    return {
      logs: [],
      stats: {},
      filters: {
        method: '',
        status: '',
        limit: 50,
        offset: 0
      }
    }
  },
  
  async mounted() {
    await this.loadLogs();
    await this.loadStats();
  },
  
  methods: {
    async loadLogs() {
      const params = new URLSearchParams(this.filters);
      const response = await fetch(`/api/logs?${params}`);
      const data = await response.json();
      this.logs = data.data.logs;
    },
    
    async loadStats() {
      const response = await fetch('/api/logs/stats');
      const data = await response.json();
      this.stats = data.data;
    }
  }
}
```

## Setup Instructions

### 1. Install Dependencies
The logging system is already integrated into your Express app. No additional dependencies required.

### 2. Middleware Setup
The structured logger middleware is automatically applied to all routes in your app.

### 3. View Logs
- **API**: Use the endpoints above
- **File**: Check `src/logs/structured-logs.json`
- **Web UI**: Open `logs-viewer.html` in your browser

## File Storage

Logs are stored in:
- **Structured logs**: `src/logs/structured-logs.json`
- **Traditional logs**: `src/logs/login.log` (for specific routes)

## Performance Considerations

- **Log Rotation**: Consider implementing log rotation for production
- **Database Storage**: For high-traffic apps, consider storing logs in a database
- **Async Logging**: The current implementation is synchronous; consider async for better performance
- **Log Retention**: Implement automatic cleanup of old logs

## Security Notes

- **Access Control**: Add authentication to log endpoints in production
- **Sensitive Data**: Ensure no sensitive data is logged (passwords, tokens, etc.)
- **IP Privacy**: Consider anonymizing IP addresses for GDPR compliance

## Monitoring Integration

The logs API can be integrated with monitoring tools:

```javascript
// Example: Send critical errors to monitoring service
if (log.status >= 500) {
  await sendToMonitoring({
    level: 'error',
    message: `Server error on ${log.url}`,
    metadata: log
  });
}
```

## Production Deployment

For production environments:

1. **Add Authentication**: Protect log endpoints
2. **Rate Limiting**: Limit access to log endpoints
3. **Log Rotation**: Implement automatic log cleanup
4. **Database Storage**: Consider MongoDB/PostgreSQL for better performance
5. **Caching**: Cache statistics for better performance

## Troubleshooting

**Common Issues:**

1. **Logs not appearing**: Check if middleware is properly registered
2. **Performance issues**: Consider async logging or database storage
3. **Large log files**: Implement log rotation
4. **CORS issues**: Ensure CORS is configured for frontend access

**Debug Mode:**
```javascript
// Enable debug logging
console.log('Logging request:', req.method, req.url);
```

## Contributing

To extend the logging functionality:

1. **Add new filters**: Extend the query parameter handling
2. **Add new statistics**: Modify the stats calculation logic
3. **Add new export formats**: Create additional export endpoints
4. **Add real-time features**: Implement WebSocket for live log streaming

---

**Happy Logging! 📊✨**
