/**
 * Idempotency Key Handler
 * Prevents duplicate transactions from double-clicks or retries
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';

// In-memory store for development (use Redis in production)
const idempotencyStore = new Map<string, {
  response: any;
  statusCode: number;
  createdAt: Date;
  expiresAt: Date;
}>();

// Cleanup expired keys every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const KEY_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = new Date();
  for (const [key, value] of idempotencyStore.entries()) {
    if (value.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Extract idempotency key from request
 */
export const getIdempotencyKey = (req: Request): string | null => {
  // Check header first (standard)
  const headerKey = req.headers['idempotency-key'] || req.headers['x-idempotency-key'];
  if (headerKey && typeof headerKey === 'string') {
    return headerKey;
  }
  
  // Also check body for backwards compatibility
  if (req.body?.idempotency_key) {
    return req.body.idempotency_key;
  }
  
  return null;
};

/**
 * Generate a composite key including user info
 */
const generateCompositeKey = (req: Request, key: string): string => {
  const userId = req.userId || 'anonymous';
  const endpoint = `${req.method}:${req.path}`;
  return `${userId}:${endpoint}:${key}`;
};

/**
 * Idempotency middleware
 * Intercepts requests with idempotency keys and returns cached responses
 */
export const idempotencyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const key = getIdempotencyKey(req);
  
  // No key provided, proceed normally
  if (!key) {
    next();
    return;
  }
  
  const compositeKey = generateCompositeKey(req, key);
  
  // Check if we have a cached response
  const cached = idempotencyStore.get(compositeKey);
  
  if (cached) {
    // Check if expired
    if (cached.expiresAt < new Date()) {
      idempotencyStore.delete(compositeKey);
    } else {
      // Return cached response
      console.log(`[Idempotency] Returning cached response for key: ${key}`);
      res.status(cached.statusCode).json({
        ...cached.response,
        _idempotent: true,
        _originalTimestamp: cached.createdAt.toISOString(),
      });
      return;
    }
  }
  
  // Store reference to original json method
  const originalJson = res.json.bind(res);
  
  // Override json to capture response
  res.json = (body: any) => {
    // Only cache successful responses (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const now = new Date();
      idempotencyStore.set(compositeKey, {
        response: body,
        statusCode: res.statusCode,
        createdAt: now,
        expiresAt: new Date(now.getTime() + KEY_EXPIRY),
      });
      console.log(`[Idempotency] Cached response for key: ${key}`);
    }
    
    return originalJson(body);
  };
  
  next();
};

/**
 * Check if a transaction with this reference already exists
 * Database-level idempotency check
 */
export const checkTransactionIdempotency = async (
  referenceId: string
): Promise<{ exists: boolean; transaction?: any }> => {
  try {
    const result = await query(
      'SELECT * FROM transactions WHERE reference_id = $1 LIMIT 1',
      [referenceId]
    );
    
    if (result.rowCount && result.rowCount > 0) {
      return { exists: true, transaction: result.rows[0] };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Idempotency check error:', error);
    return { exists: false };
  }
};

/**
 * Generate a unique transaction reference ID
 */
export const generateReferenceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

/**
 * Validate idempotency key format
 */
export const isValidIdempotencyKey = (key: string): boolean => {
  // Key should be a non-empty string, max 64 characters
  if (!key || typeof key !== 'string') return false;
  if (key.length > 64) return false;
  // Allow alphanumeric, dashes, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(key);
};

/**
 * Idempotency middleware with validation
 */
export const strictIdempotencyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const key = getIdempotencyKey(req);
  
  if (key && !isValidIdempotencyKey(key)) {
    res.status(400).json({
      success: false,
      error: 'Invalid idempotency key format',
      code: 'INVALID_IDEMPOTENCY_KEY',
    });
    return;
  }
  
  // Use the regular middleware
  idempotencyMiddleware(req, res, next);
};

/**
 * Clear idempotency cache (for testing)
 */
export const clearIdempotencyCache = (): void => {
  idempotencyStore.clear();
};

/**
 * Get idempotency cache stats
 */
export const getIdempotencyStats = (): {
  size: number;
  keys: string[];
} => {
  return {
    size: idempotencyStore.size,
    keys: Array.from(idempotencyStore.keys()),
  };
};

export default {
  idempotencyMiddleware,
  strictIdempotencyMiddleware,
  getIdempotencyKey,
  checkTransactionIdempotency,
  generateReferenceId,
  isValidIdempotencyKey,
  clearIdempotencyCache,
  getIdempotencyStats,
};
