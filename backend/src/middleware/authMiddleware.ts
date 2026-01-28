/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, DecodedToken } from '../utils/jwt';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
      userId?: string;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 * Attach to protected routes to require authentication
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    // Also check for token in cookies (HttpOnly cookie support)
    const cookieToken = req.cookies?.accessToken;
    const finalToken = token || cookieToken;
    
    if (!finalToken) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_TOKEN',
      });
      return;
    }
    
    // Verify the token
    const decoded = verifyAccessToken(finalToken);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      return;
    }
    
    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Admin-only middleware
 * Use after authMiddleware to restrict to admin users
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'NO_AUTH',
    });
    return;
  }
  
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
    return;
  }
  
  next();
};

/**
 * Optional authentication middleware
 * Attaches user data if token present, but doesn't require it
 */
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    const cookieToken = req.cookies?.accessToken;
    const finalToken = token || cookieToken;
    
    if (finalToken) {
      const decoded = verifyAccessToken(finalToken);
      if (decoded) {
        req.user = decoded;
        req.userId = decoded.userId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Rate limiting helper - tracks request counts per user
 * Simple in-memory implementation (use Redis in production)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.userId || req.ip || 'anonymous';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      // New window
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (record.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }
    
    record.count++;
    next();
  };
};

/**
 * Resource owner verification middleware
 * Ensures user can only access their own resources
 */
export const resourceOwnerMiddleware = (
  paramName: string = 'userId'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'NO_AUTH',
      });
      return;
    }
    
    const resourceUserId = req.params[paramName];
    
    // Admins can access any resource
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    
    // Users can only access their own resources
    if (resourceUserId && resourceUserId !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'FORBIDDEN',
      });
      return;
    }
    
    next();
  };
};

export default {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  resourceOwnerMiddleware,
};
