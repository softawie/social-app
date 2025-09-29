import { Router, Request, Response } from "express";
import { structuredLogger } from "@utils/logger/structured-logger";
import { SucRes } from "@utils/response.handler";
import fs from "node:fs";
import path from "node:path";

const logsRouter = Router();

// GET /logs - Retrieve logs with pagination and filtering
logsRouter.get("/logs", (req: Request, res: Response) => {
  try {
    const {
      limit = "50",
      offset = "0",
      method,
      status,
      startDate,
      endDate
    } = req.query;

    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);

    let result;

    // Apply filters if provided
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const filteredLogs = structuredLogger.getLogsByDateRange(start, end);
      result = {
        logs: filteredLogs.slice(offsetNum, offsetNum + limitNum),
        total: filteredLogs.length
      };
    } else if (method) {
      const filteredLogs = structuredLogger.getLogsByMethod(method as string);
      result = {
        logs: filteredLogs.slice(offsetNum, offsetNum + limitNum),
        total: filteredLogs.length
      };
    } else if (status) {
      const statusNum = parseInt(status as string);
      const filteredLogs = structuredLogger.getLogsByStatus(statusNum);
      result = {
        logs: filteredLogs.slice(offsetNum, offsetNum + limitNum),
        total: filteredLogs.length
      };
    } else {
      result = structuredLogger.getLogs(limitNum, offsetNum);
    }

    SucRes({
      res,
      statusCode: 200,
      message: "Logs retrieved successfully",
      data: {
        ...result,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < result.total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving logs", error: (error as Error).message });
  }
});

// GET /logs/stats - Get log statistics
logsRouter.get("/logs/stats", (req: Request, res: Response) => {
  try {
    const { logs } = structuredLogger.getLogs();
    
    const stats = {
      total: logs.length,
      methods: {} as Record<string, number>,
      statusCodes: {} as Record<string, number>,
      averageResponseTime: 0,
      totalRequests24h: 0,
      errorRate: 0
    };

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let totalResponseTime = 0;
    let errorCount = 0;

    logs.forEach(log => {
      // Count methods
      stats.methods[log.method] = (stats.methods[log.method] || 0) + 1;
      
      // Count status codes
      const statusGroup = Math.floor(log.status / 100) + "xx";
      stats.statusCodes[statusGroup] = (stats.statusCodes[statusGroup] || 0) + 1;
      
      // Calculate average response time
      totalResponseTime += log.responseTime;
      
      // Count errors (4xx and 5xx)
      if (log.status >= 400) {
        errorCount++;
      }
      
      // Count requests in last 24h
      if (new Date(log.timestamp) >= yesterday) {
        stats.totalRequests24h++;
      }
    });

    stats.averageResponseTime = logs.length > 0 ? Math.round(totalResponseTime / logs.length) : 0;
    stats.errorRate = logs.length > 0 ? Math.round((errorCount / logs.length) * 100) : 0;

    SucRes({
      res,
      statusCode: 200,
      message: "Log statistics retrieved successfully",
      data: stats
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving log statistics", error: (error as Error).message });
  }
});

// DELETE /logs - Clear all logs (admin only)
logsRouter.delete("/logs", (req: Request, res: Response) => {
  try {
    structuredLogger.clearLogs();
    SucRes({
      res,
      statusCode: 200,
      message: "All logs cleared successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Error clearing logs", error: (error as Error).message });
  }
});

// GET /logs/export - Export logs as JSON
logsRouter.get("/logs/export", (req: Request, res: Response) => {
  try {
    const { logs } = structuredLogger.getLogs();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error exporting logs", error: (error as Error).message });
  }
});

// GET /logs/route/:routeName - Get logs for specific route
logsRouter.get("/logs/route/:routeName", (req: Request, res: Response) => {
  try {
    const { routeName } = req.params;
    const { limit = "50", offset = "0" } = req.query;
    
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    
    // Construct the log file path
    const projectRoot = path.resolve();
    const logFilePath = path.join(projectRoot, "src/logs", `${routeName}.json`);
    
    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({ 
        message: `No logs found for route: ${routeName}`,
        availableRoutes: getAvailableRoutes()
      });
    }
    
    const data = fs.readFileSync(logFilePath, "utf8");
    const allLogs = JSON.parse(data);
    
    // Apply pagination
    const total = allLogs.length;
    const logs = allLogs.slice(offsetNum, offsetNum + limitNum);
    
    SucRes({
      res,
      statusCode: 200,
      message: `Logs for route '${routeName}' retrieved successfully`,
      data: {
        logs,
        total,
        route: routeName,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error retrieving route logs", 
      error: (error as Error).message 
    });
  }
});

// GET /logs/routes - Get list of available route logs
logsRouter.get("/logs/routes", (req: Request, res: Response) => {
  try {
    const availableRoutes = getAvailableRoutes();
    
    SucRes({
      res,
      statusCode: 200,
      message: "Available route logs retrieved successfully",
      data: {
        routes: availableRoutes,
        total: availableRoutes.length
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error retrieving available routes", 
      error: (error as Error).message 
    });
  }
});

// Helper function to get available route log files
function getAvailableRoutes(): string[] {
  try {
    const projectRoot = path.resolve();
    const logsDir = path.join(projectRoot, "src/logs");
    
    if (!fs.existsSync(logsDir)) {
      return [];
    }
    
    const files = fs.readdirSync(logsDir);
    return files
      .filter(file => file.endsWith('.json') && file !== 'structured-logs.json')
      .map(file => file.replace('.json', ''));
  } catch (error) {
    console.error("Error reading logs directory:", error);
    return [];
  }
}

export default logsRouter;
