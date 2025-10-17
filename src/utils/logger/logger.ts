import morgan from "morgan";
import fs from "node:fs";
import { Express, Router, Request, Response, NextFunction } from "express";
import path from "node:path";

const projectRoot = path.resolve();

interface RouteLogEntry {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
}

class RouteLogger {
  private logFilePath: string;
  private logs: RouteLogEntry[] = [];
  private currentId = 1;

  constructor(logsFileName: string) {
    this.logFilePath = path.join(projectRoot, "src/logs", logsFileName.replace('.log', '.json'));
    console.log(`RouteLogger initialized for: ${logsFileName}`);
    console.log(`Log file path: ${this.logFilePath}`);
    this.loadExistingLogs();
  }

  private loadExistingLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, "utf8");
        this.logs = JSON.parse(data);
        this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
      }
    } catch (error) {
      console.error(`Error loading existing logs from ${this.logFilePath}:`, error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      const logsDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error(`Error saving logs to ${this.logFilePath}:`, error);
    }
  }

  public logRequest(req: Request, res: Response, responseTime: number): void {
    console.log(`RouteLogger.logRequest called for: ${req.method} ${req.originalUrl || req.url}`);
    
    const logEntry: RouteLogEntry = {
      id: this.currentId++,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime,
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown"
    };

    this.logs.push(logEntry);
    console.log(`Saving log entry to: ${this.logFilePath}`);
    this.saveLogs();

    // Also log to console in dev format
    console.log(`${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${responseTime}ms - ${req.ip}`);
  }

  public getLogs(): RouteLogEntry[] {
    return [...this.logs].reverse(); // Most recent first
  }
}

export const getRouteLogger = (
  app: Express,
  routePath: string,
  router: Router,
  logsFileName: string
) => {
  const routeLogger = new RouteLogger(logsFileName);

  // Create middleware to capture structured logs for specific route
  const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Override res.end to capture response time
    const originalEnd = res.end.bind(res);
    res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
      const responseTime = Date.now() - startTime;
      routeLogger.logRequest(req, res, responseTime);
      return originalEnd(chunk, encoding, cb);
    };

    next();
  };

  // Apply the middleware and router
  app.use(routePath, loggerMiddleware, router);

  // Return the logger instance for potential external access
  return routeLogger;
};
