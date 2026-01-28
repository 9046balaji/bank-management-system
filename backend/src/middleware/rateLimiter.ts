/**
 * Rate Limiting Middleware
 * 
 * Different rate limits for different types of endpoints:
 * - Sensitive (login, register, transfer): 5-10 requests per minute
 * - Standard (most authenticated endpoints): 100 requests per minute
 * - Relaxed (read-only endpoints): 200 requests per minute
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';

// Custom key generator that uses user ID if authenticated, otherwise IP
const keyGenerator = (req: Request): string => {
  const userId = (req as any).user?.id;
  if (userId) {
    return `user_${userId}`;
  }
  // Use X-Forwarded-For for proxied requests, otherwise use IP
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) 
    ? forwardedFor[0] 
    : forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';
  return `ip_${ip}`;
};

// Skip rate limiting for health checks and certain paths
const skipFunction = (req: Request): boolean => {
  const skipPaths = ['/health', '/api/health/db'];
  return skipPaths.includes(req.path);
};

// Standard error response
const createHandler = (message: string) => (req: Request, res: Response) => {
  res.status(429).json({
    success: false,
    error: 'Too Many Requests',
    message,
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Strict rate limit for authentication endpoints
 * Login: 5 attempts per 15 minutes (prevents brute force)
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Too many login attempts. Please wait 15 minutes before trying again.'),
  skip: skipFunction,
});

/**
 * Strict rate limit for registration
 * 3 registrations per hour per IP
 */
export const registrationRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Too many registration attempts. Please try again later.'),
  skip: skipFunction,
});

/**
 * Rate limit for financial transactions (transfers, withdrawals)
 * 10 transactions per minute
 */
export const transactionRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Transaction rate limit exceeded. Please wait before making more transactions.'),
  skip: skipFunction,
});

/**
 * Standard rate limit for authenticated endpoints
 * 100 requests per minute
 */
export const standardRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Rate limit exceeded. Please slow down your requests.'),
  skip: skipFunction,
});

/**
 * Relaxed rate limit for read-only endpoints
 * 200 requests per minute
 */
export const readOnlyRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Rate limit exceeded. Please slow down your requests.'),
  skip: skipFunction,
});

/**
 * Very strict rate limit for password reset
 * 3 attempts per hour
 */
export const passwordResetRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Too many password reset attempts. Please try again later.'),
  skip: skipFunction,
});

/**
 * Rate limit for ATM code generation
 * 5 codes per hour
 */
export const atmCodeRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Too many ATM code requests. Please try again later.'),
  skip: skipFunction,
});

/**
 * Rate limit for ML/AI endpoints
 * 30 requests per minute
 */
export const mlRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('ML service rate limit exceeded. Please slow down.'),
  skip: skipFunction,
});

/**
 * Global rate limit as a safety net
 * 500 requests per minute per IP/user
 */
export const globalRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: createHandler('Global rate limit exceeded. Please slow down.'),
  skip: skipFunction,
});

export default {
  authRateLimiter,
  registrationRateLimiter,
  transactionRateLimiter,
  standardRateLimiter,
  readOnlyRateLimiter,
  passwordResetRateLimiter,
  atmCodeRateLimiter,
  mlRateLimiter,
  globalRateLimiter,
};
