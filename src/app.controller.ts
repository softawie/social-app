import express, { Express} from "express";
import { CheckDB } from "@db/connectionDB";
import { RedisConnection } from "@db/redis.connection";
import userRouter from "@modules/users/user.controller";
import authRouter from "@modules/auth/auth.controller";
import logsRouter from "@modules/logs/logs.controller";
import backupRouter from "@modules/backup/backup.routes";
import postRouter from "@modules/post/post.routes";
import commentRouter from "@modules/comment/comment.routes";
import friendRequestRouter from "@modules/friend-request/friend-request.routes";
import redisRouter from "@modules/redis/redis.routes";
import socketRouter from "@modules/socket/socket.routes";
import { globalErrorHandler, NotFoundException } from "@utils/globalError.handler";
import * as cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getRouteLogger } from "@utils/logger/logger";
import { structuredLoggerMiddleware } from "@utils/logger/structured-logger";
import { startSuccessLogsCleanupJob } from "@src/jobs/logs.cleanup.job";
import { BackupCleanupJob } from "@src/jobs/backup.cleanup.job";
import { AutoBackupJob } from "@src/jobs/auto.backup.job";
import { HealthCheckService } from "@utils/health-check.utils";
import { SocketGateway } from "@modules/socket";

const limitRequest = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 100 requests per windowMs
  message: {message:"Too many requests from this IP, please try again after 15 minutes", cause: 429},
});

const bootstrap = async (app: Express) => {
  app.use(cors.default(),express.json(),helmet(),limitRequest)
  
  // Add structured logging middleware for all routes
  app.use(structuredLoggerMiddleware);
  
  await CheckDB();
  
  // Initialize Socket.IO Gateway
  const socketGateway = new SocketGateway(app);
  console.log('✅ Socket.IO initialized successfully');
  
  // Initialize Redis connection
  try {
    await RedisConnection.connect();
  } catch (error) {
    console.warn('⚠️ Redis connection failed, continuing without Redis features');
  }
  // Start daily cleanup job (deletes success logs at 21:00 local time)
  startSuccessLogsCleanupJob();
  // Start weekly backup cleanup job (deletes old backups every Sunday at 2:00 AM)
  BackupCleanupJob.startWeeklyBackupCleanup();
  // Start daily auto-backup job (creates backups every day at 11:00 PM)
  AutoBackupJob.startDailyAutoBackup();
  app.use("/uploads", express.static("./src/uploads"));
  
  // Use getRouteLogger for auth routes (this will mount the authRouter with logging)
  // Mount auth routes before user routes to avoid conflicts
  
  app.use("/", userRouter);
  getRouteLogger(app,"/auth",authRouter,"login.log");

  app.use("/api", logsRouter);
  app.use("/api/friend-requests", friendRequestRouter);
  app.use("/api/backup", backupRouter);
  app.use("/api/redis", redisRouter);
  app.use("/api/socket", socketRouter);
  app.use("/api/posts", postRouter);
  app.use("/api/comments", commentRouter);
  
  // Public app config for static tools (e.g., logs viewer)
  app.get("/app-config", (req, res) => {
    const port = parseInt(process.env.PORT || '3000');
    const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
    res.json({
      baseUrl,
      apiBase: `${baseUrl}/api`,
    });
  });

  // Serve the logs viewer page
  app.get("/logs-viewer", (req, res) => {
    const filePath = require('node:path').resolve('logs-viewer.html');
    return res.sendFile(filePath);
  });

  // Serve the Socket.IO test page
  app.get("/socket-test", (req, res) => {
    const filePath = require('node:path').resolve('socket-test.html');
    return res.sendFile(filePath);
  });

  // Health check endpoints
  app.get("/health", async (req, res) => {
    try {
      const isHealthy = await HealthCheckService.isHealthy();
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get("/health/detailed", async (req, res) => {
    try {
      const healthStatus = await HealthCheckService.getHealthStatus();
      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(healthStatus);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });
  
  // not found route
  app.all("/*dummy", (req, res, next) => {
    // return res.status(404).json({ message: "Route not found" });
    // return next(new NotFoundException("Route not found"));
    throw new NotFoundException("Route not found");
  });
  // Global error handler
  app.use(globalErrorHandler);
};

export { bootstrap };
