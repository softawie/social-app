import { Request, Response, NextFunction } from "express";
import { EnvEnum } from "./enums";

export interface IError extends Error {
  statusCode: number;
}

export class AppException extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadReqException extends AppException {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 400, options);
  }
}

export class NotFoundException extends AppException {
  constructor(message: string, options?: ErrorOptions) {
    super(message, 404, options);
  }
}

export const globalErrorHandler = (
  err: IError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  return res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === EnvEnum.DEVELOPER ? err.stack : undefined,
    cause: err.cause,
  });
};
