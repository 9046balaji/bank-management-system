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

/**
 * Resource ownership verification by resource type
 * Checks if user owns the resource (account, card, loan, etc.)
 */
import { query } from '../db/connection';

type ResourceType = 'account' | 'card' | 'loan' | 'transaction' | 'ticket';

const resourceQueries: Record<ResourceType, string> = {
  account: 'SELECT user_id FROM accounts WHERE id = $1',
  card: 'SELECT a.user_id FROM cards c JOIN accounts a ON c.account_id = a.id WHERE c.id = $1',
  loan: 'SELECT user_id FROM loans WHERE id = $1',
  transaction: 'SELECT a.user_id FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE t.id = $1',
  ticket: 'SELECT user_id FROM support_tickets WHERE id = $1',
};

export const ownershipMiddleware = (resourceType: ResourceType, paramName: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'NO_AUTH',
        });
        return;
      }

      // Admins can access any resource
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        next();
        return;
      }

      const sql = resourceQueries[resourceType];
      if (!sql) {
        console.error(`Unknown resource type: ${resourceType}`);
        next();
        return;
      }

      const result = await query(sql, [resourceId]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'NOT_FOUND',
        });
        return;
      }

      const ownerId = result.rows[0].user_id;
      if (ownerId !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: 'Access denied - you do not own this resource',
          code: 'FORBIDDEN',
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify resource ownership',
        code: 'OWNERSHIP_CHECK_ERROR',
      });
    }
  };
};

export default {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware,
  rateLimitMiddleware,
  resourceOwnerMiddleware,
  ownershipMiddleware,
};
