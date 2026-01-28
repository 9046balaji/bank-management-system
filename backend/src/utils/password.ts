/**
 * Password Hashing Utilities
 * Uses bcryptjs for secure password hashing (Argon2-compatible alternative)
 */

import bcrypt from 'bcryptjs';

// Number of salt rounds - 12 is a good balance between security and performance
const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password || password.length < 1) {
    throw new Error('Password cannot be empty');
  }
  
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  const hashedPassword = await bcrypt.hash(password, salt);
  return hashedPassword;
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  if (!password || !hashedPassword) {
    return false;
  }
  
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with isValid flag and any error messages
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
};
