import { Response } from "express";

interface SendResponseParams<T> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
}

export const SucRes = <T>({
  res,
  statusCode = 200,
  message = "Success",
  data = {} as T,
}: SendResponseParams<T>): void => {
  res.status(statusCode).json({ message, data });
};
