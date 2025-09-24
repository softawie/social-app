import express, { Express} from "express";
import { CheckDB } from "@db/connectionDB";
import userRouter from "@modules/users/user.controller";
import authRouter from "@modules/auth/auth.controller";
import { globalErrorHandler } from "@utils/globalError.handler";
import * as cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const limitRequest = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {message:"Too many requests from this IP, please try again after 15 minutes", cause: 429},
});


const bootstrap = async (app: Express) => {
  app.use(cors.default(),express.json(),helmet(),limitRequest)
  await CheckDB();
  app.use("/uploads", express.static("./src/uploads"));
  app.use("/", userRouter);
  app.use("/", authRouter);
  // not found route
  app.all("/*dummy", (req, res, next) => {
    // return res.status(404).json({ message: "Route not found" });
    return next(new Error("Route not found", { cause: 404 }));
  });
  // Global error handler
  app.use(globalErrorHandler);
};

export { bootstrap };
