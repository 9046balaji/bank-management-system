/**
 * Account Lockout Middleware
 * Prevents brute force attacks by locking accounts after failed login attempts
 */

import { Request, Response, NextFunction } from 'express';

interface LoginAttempt {
  attempts: number;
  lockedUntil: Date | null;
  lastAttempt: Date;
}

// In-memory store for login attempts (consider Redis for production)
const loginAttempts = new Map<string, LoginAttempt>();

// Configuration
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for attempts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean up old entries every 5 minutes

/**
 * Get lockout key from email (normalized)
 */
function getLockoutKey(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Check if an account is currently locked
 */
export function isAccountLocked(email: string): { locked: boolean; remainingMs?: number } {
  const key = getLockoutKey(email);
  const attempt = loginAttempts.get(key);
  
  if (!attempt || !attempt.lockedUntil) {
    return { locked: false };
  }
  
  const now = new Date();
  if (attempt.lockedUntil > now) {
    return { 
      locked: true, 
      remainingMs: attempt.lockedUntil.getTime() - now.getTime() 
    };
  }
  
  // Lock has expired, reset
  loginAttempts.delete(key);
  return { locked: false };
}

/**
 * Get remaining attempts before lockout
 */
export function getRemainingAttempts(email: string): number {
  const key = getLockoutKey(email);
  const attempt = loginAttempts.get(key);
  
  if (!attempt) {
    return MAX_ATTEMPTS;
  }
  
  // Check if attempts are within the window
  const now = new Date();
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  
  if (attempt.lastAttempt < windowStart) {
    // Attempts are outside window, reset
    loginAttempts.delete(key);
    return MAX_ATTEMPTS;
  }
  
  return Math.max(0, MAX_ATTEMPTS - attempt.attempts);
}

/**
 * Record a login attempt
 */
export function recordLoginAttempt(email: string, success: boolean): void {
  const key = getLockoutKey(email);
  const now = new Date();
  
  if (success) {
    // Successful login - clear attempts
    loginAttempts.delete(key);
    return;
  }
  
  // Failed login - record attempt
  const existing = loginAttempts.get(key);
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  
  if (!existing || existing.lastAttempt < windowStart) {
    // First attempt or outside window
    loginAttempts.set(key, {
      attempts: 1,
      lockedUntil: null,
      lastAttempt: now,
    });
    return;
  }
  
  // Increment attempts
  const newAttempts = existing.attempts + 1;
  
  loginAttempts.set(key, {
    attempts: newAttempts,
    lockedUntil: newAttempts >= MAX_ATTEMPTS 
      ? new Date(now.getTime() + LOCKOUT_DURATION_MS) 
      : null,
    lastAttempt: now,
  });
}

/**
 * Middleware to check account lockout before login
 */
export function checkAccountLockout(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { email } = req.body;
  
  if (!email) {
    next();
    return;
  }
  
  const lockStatus = isAccountLocked(email);
  
  if (lockStatus.locked) {
    const remainingMinutes = Math.ceil((lockStatus.remainingMs || 0) / 60000);
    
    res.status(429).json({
      success: false,
      error: 'Account temporarily locked',
      message: `Too many failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      lockedUntil: new Date(Date.now() + (lockStatus.remainingMs || 0)).toISOString(),
    });
    return;
  }
  
  // Add remaining attempts to response header for client info
  const remaining = getRemainingAttempts(email);
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  
  next();
}

/**
 * Clear lockout for an account (admin function)
 */
export function clearAccountLockout(email: string): boolean {
  const key = getLockoutKey(email);
  return loginAttempts.delete(key);
}

/**
 * Get lockout status for an account (admin function)
 */
export function getAccountLockoutStatus(email: string): LoginAttempt | null {
  const key = getLockoutKey(email);
  return loginAttempts.get(key) || null;
}

/**
 * Clean up expired entries
 */
function cleanupExpiredEntries(): void {
  const now = new Date();
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
  
  for (const [key, attempt] of loginAttempts.entries()) {
    // Remove if both lock expired and last attempt is outside window
    const lockExpired = !attempt.lockedUntil || attempt.lockedUntil <= now;
    const attemptExpired = attempt.lastAttempt < windowStart;
    
    if (lockExpired && attemptExpired) {
      loginAttempts.delete(key);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);

export default {
  checkAccountLockout,
  recordLoginAttempt,
  isAccountLocked,
  getRemainingAttempts,
  clearAccountLockout,
  getAccountLockoutStatus,
};
