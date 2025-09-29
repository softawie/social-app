import { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";

export interface LogEntry {
  id: number;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  responseTime: number;
  ip: string;
  userAgent: string;
  requestHeaders?: Record<string, any>;
  responseHeaders?: Record<string, any>;
  requestBody?: any;
  responseBody?: any;
  error?: any;
}

class StructuredLogger {
  private logFilePath: string;
  private logs: LogEntry[] = [];
  private currentId = 1;

  constructor() {
    const projectRoot = path.resolve();
    this.logFilePath = path.join(projectRoot, "src/logs", "structured-logs.json");
    this.loadExistingLogs();
  }

  private loadExistingLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, "utf8");
        this.logs = JSON.parse(data);
        // Set currentId to the next available ID
        this.currentId = this.logs.length > 0 ? Math.max(...this.logs.map(log => log.id)) + 1 : 1;
      }
    } catch (error) {
      console.error("Error loading existing logs:", error);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2));
    } catch (error) {
      console.error("Error saving logs:", error);
    }
  }

  public logRequest(req: Request, res: Response, responseTime: number, responseBody?: any, error?: any): void {
    const logEntry: LogEntry = {
      id: this.currentId++,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime,
      ip: req.ip || req.connection.remoteAddress || "unknown",
      userAgent: req.get("User-Agent") || "unknown",
      requestHeaders: req.headers,
      responseHeaders: res.getHeaders(),
      requestBody: req.body,
      responseBody: responseBody,
      error: error
    };

    this.logs.push(logEntry);
    this.saveLogs();
  }

  public getLogs(limit?: number, offset?: number): { logs: LogEntry[], total: number } {
    const total = this.logs.length;
    let filteredLogs = [...this.logs].reverse(); // Most recent first

    if (offset) {
      filteredLogs = filteredLogs.slice(offset);
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(0, limit);
    }

    return { logs: filteredLogs, total };
  }

  public getLogsByDateRange(startDate: Date, endDate: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  public getLogsByStatus(status: number): LogEntry[] {
    return this.logs.filter(log => log.status === status);
  }

  public getLogsByMethod(method: string): LogEntry[] {
    return this.logs.filter(log => log.method.toLowerCase() === method.toLowerCase());
  }

  public getLogById(id: number): LogEntry | undefined {
    return this.logs.find(log => log.id === id);
  }

  public clearLogs(): void {
    this.logs = [];
    this.currentId = 1;
    this.saveLogs();
  }
}

// Singleton instance
export const structuredLogger = new StructuredLogger();

// Middleware function
export const structuredLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  let responseBody: any;
  let error: any;

  // Override res.json to capture response body
  const originalJson = res.json.bind(res);
  res.json = function(body?: any): Response {
    responseBody = body;
    return originalJson(body);
  };

  // Override res.send to capture response body
  const originalSend = res.send.bind(res);
  res.send = function(body?: any): Response {
    if (!responseBody) {
      responseBody = body;
    }
    return originalSend(body);
  };

  // Override res.end to capture response time and log
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: () => void): Response {
    const responseTime = Date.now() - startTime;
    
    // If chunk is provided and no responseBody captured, use chunk
    if (chunk && !responseBody) {
      responseBody = chunk;
    }

    // Capture error if status code indicates error
    if (res.statusCode >= 400) {
      error = responseBody || `HTTP ${res.statusCode} Error`;
    }

    structuredLogger.logRequest(req, res, responseTime, responseBody, error);
    return originalEnd(chunk, encoding, cb);
  };

  next();
};
