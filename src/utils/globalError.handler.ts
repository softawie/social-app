import { Request, Response, NextFunction } from "express";
import { EnvEnum } from "./enums";

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = typeof err.cause === "number" ? err.cause : 500;
  return res.status(statusCode).json({
    message: "Internal Server Error",
    error: err.message || "An unexpected error occurred",
    stack: process.env.NODE_ENV === EnvEnum.DEVELOPER ? err.stack : undefined,
  });
};
