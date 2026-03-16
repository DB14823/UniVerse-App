import { Request, Response, NextFunction } from "express";

/**
 * Custom error class with HTTP status code
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Global error handling middleware
 * Catches all errors and returns standardized error responses
 */
export const globalErrorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error("\n=== ERROR START ===");
  console.error("Time:", new Date().toISOString());
  console.error("Path:", req.method, req.path);
  console.error("Error:", err.message);
  if (err instanceof AppError) {
    console.error("Status Code:", err.statusCode);
  }
  console.error("Stack:", err.stack);
  console.error("=== ERROR END ===\n");

  // Determine status code
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // Determine if error is operational (expected) or programming error
  const isOperational = err instanceof AppError ? err.isOperational : false;

  // Build error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message: isOperational
        ? err.message
        : "An unexpected error occurred. Please try again later.",
      code: err instanceof AppError ? `ERR_${statusCode}` : "ERR_INTERNAL",
    },
    timestamp: new Date().toISOString(),
    requestId: (req as any).id, // If using request ID middleware
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.error.stack = err.stack;
    errorResponse.error.details = err;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found middleware
 * Handles 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const err = new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404);
  next(err);
};
