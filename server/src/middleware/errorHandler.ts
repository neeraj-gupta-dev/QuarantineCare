import { Request, Response, NextFunction } from 'express';

/**
 * Application-level error with an HTTP status code and machine-readable code.
 */
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Global error handler — returns consistent { code, message } shape.
 * Must be registered AFTER all routes.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  // Mongoose CastError (bad ObjectId, etc.)
  if (err.name === 'CastError') {
    res.status(400).json({ code: 'INVALID_ID', message: 'Invalid ID format' });
    return;
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: err.message });
    return;
  }

  // Fallback
  console.error('Unhandled error:', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' });
}
