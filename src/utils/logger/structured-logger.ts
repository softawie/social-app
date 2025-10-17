import { Request, Response, NextFunction } from "express";
import LogModel, { ILog } from "@db/models/log.model";
import CounterModel from "@db/models/counter.model";

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
  private async getNextSequence(name: string): Promise<number> {
    const doc = await CounterModel.findByIdAndUpdate(
      name,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return doc.seq;
  }

  public async logRequest(req: Request, res: Response, responseTime: number, responseBody?: any, error?: any): Promise<void> {
    try {
      const nextId = await this.getNextSequence("logs");
      const logEntry: LogEntry = {
        id: nextId,
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        responseTime,
        ip: (req.ip as string) || (req.connection as any)?.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        requestHeaders: req.headers,
        responseHeaders: res.getHeaders(),
        requestBody: req.body,
        responseBody: responseBody,
        error: error
      };

      await LogModel.create(logEntry as unknown as ILog);
    } catch (e) {
      // Fail silently to not break requests
      // console.error("Error writing log:", e);
    }
  }

  public async getLogs(limit = 50, offset = 0): Promise<{ logs: LogEntry[]; total: number }> {
    const total = await LogModel.countDocuments({});
    const docs = await LogModel.find({})
      .sort({ id: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return { logs: docs as unknown as LogEntry[], total };
  }

  public async getLogsByDateRange(startDate: Date, endDate: Date): Promise<LogEntry[]> {
    const docs = await LogModel.find({
      timestamp: { $gte: startDate.toISOString(), $lte: endDate.toISOString() }
    })
      .sort({ id: -1 })
      .lean();
    return docs as unknown as LogEntry[];
  }

  public async getLogsByStatus(status: number): Promise<LogEntry[]> {
    const docs = await LogModel.find({ status }).sort({ id: -1 }).lean();
    return docs as unknown as LogEntry[];
  }

  public async getLogsByMethod(method: string): Promise<LogEntry[]> {
    const docs = await LogModel.find({ method: new RegExp(`^${method}$`, "i") })
      .sort({ id: -1 })
      .lean();
    return docs as unknown as LogEntry[];
  }

  public async getLogById(id: number): Promise<LogEntry | undefined> {
    const doc = await LogModel.findOne({ id }).lean();
    return (doc || undefined) as unknown as LogEntry | undefined;
  }

  public async clearLogs(): Promise<void> {
    await LogModel.deleteMany({});
    // reset counter
    await CounterModel.findByIdAndUpdate("logs", { $set: { seq: 0 } }, { upsert: true });
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

    // fire and forget
    void structuredLogger.logRequest(req, res, responseTime, responseBody, error);
    return originalEnd(chunk, encoding, cb);
  };

  next();
};
