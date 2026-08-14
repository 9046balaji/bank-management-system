/**
 * Account Lockout Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkAccountLockout,
  recordLoginAttempt,
  isAccountLocked,
  getRemainingAttempts,
  clearAccountLockout,
} from '../src/middleware/accountLockout';
import { Request, Response, NextFunction } from 'express';

describe('Account Lockout Middleware', () => {
  beforeEach(() => {
    // Clear lockout state between tests
    clearAccountLockout('test@example.com');
    clearAccountLockout('locked@example.com');
  });

  describe('recordLoginAttempt', () => {
    it('should track failed login attempts', () => {
      const email = 'test@example.com';
      
      expect(getRemainingAttempts(email)).toBe(5);
      
      recordLoginAttempt(email, false);
      expect(getRemainingAttempts(email)).toBe(4);
      
      recordLoginAttempt(email, false);
      expect(getRemainingAttempts(email)).toBe(3);
    });

    it('should clear attempts on successful login', () => {
      const email = 'test@example.com';
      
      recordLoginAttempt(email, false);
      recordLoginAttempt(email, false);
      expect(getRemainingAttempts(email)).toBe(3);
      
      recordLoginAttempt(email, true);
      expect(getRemainingAttempts(email)).toBe(5);
    });

    it('should lock account after 5 failed attempts', () => {
      const email = 'test@example.com';
      
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(email, false);
      }
      
      const lockStatus = isAccountLocked(email);
      expect(lockStatus.locked).toBe(true);
      expect(lockStatus.remainingMs).toBeGreaterThan(0);
    });
  });

  describe('isAccountLocked', () => {
    it('should return false for accounts with no attempts', () => {
      const lockStatus = isAccountLocked('new@example.com');
      expect(lockStatus.locked).toBe(false);
    });

    it('should return true for locked accounts', () => {
      const email = 'locked@example.com';
      
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(email, false);
      }
      
      const lockStatus = isAccountLocked(email);
      expect(lockStatus.locked).toBe(true);
    });
  });

  describe('checkAccountLockout middleware', () => {
    it('should call next() for unlocked accounts', () => {
      const req = {
        body: { email: 'unlocked@example.com' },
      } as Request;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as unknown as Response;
      
      const next = vi.fn();
      
      checkAccountLockout(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(429);
    });

    it('should return 429 for locked accounts', () => {
      const email = 'locked@example.com';
      
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(email, false);
      }
      
      const req = {
        body: { email },
      } as Request;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as unknown as Response;
      
      const next = vi.fn();
      
      checkAccountLockout(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Account temporarily locked',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() if email is not provided', () => {
      const req = {
        body: {},
      } as Request;
      
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      } as unknown as Response;
      
      const next = vi.fn();
      
      checkAccountLockout(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('clearAccountLockout', () => {
    it('should clear lockout for an account', () => {
      const email = 'test@example.com';
      
      // Lock the account
      for (let i = 0; i < 5; i++) {
        recordLoginAttempt(email, false);
      }
      
      expect(isAccountLocked(email).locked).toBe(true);
      
      clearAccountLockout(email);
      
      expect(isAccountLocked(email).locked).toBe(false);
      expect(getRemainingAttempts(email)).toBe(5);
    });
  });
});
