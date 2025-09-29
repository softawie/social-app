import express, { Express} from "express";
import { CheckDB } from "@db/connectionDB";
import userRouter from "@modules/users/user.controller";
import authRouter from "@modules/auth/auth.controller";
import logsRouter from "@modules/logs/logs.controller";
import { globalErrorHandler, NotFoundException } from "@utils/globalError.handler";
import * as cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { getRouteLogger } from "@utils/logger/logger";
import { structuredLoggerMiddleware } from "@utils/logger/structured-logger";

const limitRequest = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {message:"Too many requests from this IP, please try again after 15 minutes", cause: 429},
});

const bootstrap = async (app: Express) => {
  app.use(cors.default(),express.json(),helmet(),limitRequest)
  
  // Add structured logging middleware for all routes
  app.use(structuredLoggerMiddleware);
  
  await CheckDB();
  app.use("/uploads", express.static("./src/uploads"));
  
  // Use getRouteLogger for auth routes (this will mount the authRouter with logging)
  // Mount auth routes before user routes to avoid conflicts
  
  app.use("/", userRouter);
  getRouteLogger(app,"/",authRouter,"login.log");

  app.use("/api", logsRouter);
  
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
