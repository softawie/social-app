import { Response } from 'express';
import { AppException } from '@src/exceptions/app.exception';

export const handleControllerError = (error: unknown, res: Response) => {
  if (error instanceof AppException) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Validation error
  if ((error as any)?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: (error as any).errors,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
