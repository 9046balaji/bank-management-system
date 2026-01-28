/**
 * Error Handling Middleware
 * Centralized error handling for consistent API responses
 */

import { Request, Response, NextFunction } from 'express';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Too many requests', 429, 'RATE_LIMIT', { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `${service} service unavailable`,
      503,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method,
  });
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;
  let isOperational = false;

  // Handle known AppError types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  }
  // Handle PostgreSQL errors
  else if ((err as any).code) {
    const pgError = err as any;
    
    switch (pgError.code) {
      case '23505': // Unique violation
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
        if (pgError.constraint) {
          if (pgError.constraint.includes('email')) {
            message = 'Email already registered';
          } else if (pgError.constraint.includes('account_number')) {
            message = 'Account number already exists';
          }
        }
        break;
        
      case '23503': // Foreign key violation
        statusCode = 400;
        code = 'REFERENCE_ERROR';
        message = 'Referenced record does not exist';
        break;
        
      case '23502': // Not null violation
        statusCode = 400;
        code = 'MISSING_FIELD';
        message = 'Required field is missing';
        break;
        
      case '22P02': // Invalid text representation
        statusCode = 400;
        code = 'INVALID_INPUT';
        message = 'Invalid input format';
        break;
        
      default:
        // Log unknown database errors
        console.error('Database error:', pgError);
    }
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // Handle validation errors (e.g., from Zod)
  else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = (err as any).errors;
  }

  // Log error for debugging (only non-operational or server errors)
  if (!isOperational || statusCode >= 500) {
    console.error('Error:', {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      statusCode,
      code,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }

  // Send error response
  const response: Record<string, unknown> = {
    success: false,
    error: message,
    code,
  };

  // Include details in development or for validation errors
  if (details && (process.env.NODE_ENV === 'development' || code === 'VALIDATION_ERROR')) {
    response.details = details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Request logging middleware
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    console[logLevel === 'warn' ? 'warn' : 'log'](
      `${new Date().toISOString()} | ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms`
    );
  });
  
  next();
};

export default {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  requestLogger,
};
