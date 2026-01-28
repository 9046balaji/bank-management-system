/**
 * JWT (JSON Web Token) Utilities
 * Handles token generation, verification, and refresh
 */

import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'aura-bank-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'aura-bank-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Access token: 1 hour
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Refresh token: 7 days

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  type?: 'access' | 'refresh';
}

// Decoded token interface
export interface DecodedToken extends TokenPayload, JwtPayload {
  iat: number;
  exp: number;
}

/**
 * Generate an access token
 * @param payload - User data to encode in the token
 * @returns Signed JWT access token
 */
export const generateAccessToken = (payload: Omit<TokenPayload, 'type'>): string => {
  const tokenPayload: TokenPayload = {
    ...payload,
    type: 'access',
  };
  
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'aura-bank',
    audience: 'aura-bank-client',
  };
  
  return jwt.sign(tokenPayload, JWT_SECRET, options);
};

/**
 * Generate a refresh token
 * @param payload - User data to encode in the token
 * @returns Signed JWT refresh token
 */
export const generateRefreshToken = (payload: Omit<TokenPayload, 'type'>): string => {
  const tokenPayload: TokenPayload = {
    ...payload,
    type: 'refresh',
  };
  
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    issuer: 'aura-bank',
    audience: 'aura-bank-client',
  };
  
  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, options);
};

/**
 * Generate both access and refresh tokens
 * @param payload - User data to encode
 * @returns Object containing both tokens
 */
export const generateTokenPair = (
  payload: Omit<TokenPayload, 'type'>
): { accessToken: string; refreshToken: string } => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Verify an access token
 * @param token - JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyAccessToken = (token: string): DecodedToken | null => {
  try {
    const options: VerifyOptions = {
      issuer: 'aura-bank',
      audience: 'aura-bank-client',
    };
    
    const decoded = jwt.verify(token, JWT_SECRET, options) as DecodedToken;
    
    // Ensure it's an access token
    if (decoded.type !== 'access') {
      console.error('Invalid token type: expected access token');
      return null;
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Access token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid access token');
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
};

/**
 * Verify a refresh token
 * @param token - Refresh token to verify
 * @returns Decoded token payload or null if invalid
 */
export const verifyRefreshToken = (token: string): DecodedToken | null => {
  try {
    const options: VerifyOptions = {
      issuer: 'aura-bank',
      audience: 'aura-bank-client',
    };
    
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, options) as DecodedToken;
    
    // Ensure it's a refresh token
    if (decoded.type !== 'refresh') {
      console.error('Invalid token type: expected refresh token');
      return null;
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Refresh token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('Invalid refresh token');
    } else {
      console.error('Refresh token verification error:', error);
    }
    return null;
  }
};

/**
 * Decode a token without verification (for debugging)
 * @param token - JWT token to decode
 * @returns Decoded payload without verification
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }
  
  // Support both "Bearer <token>" and just "<token>"
  const parts = authHeader.split(' ');
  
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  
  // If no Bearer prefix, return the whole header as token
  if (parts.length === 1) {
    return parts[0];
  }
  
  return null;
};

/**
 * Check if a token is about to expire (within 5 minutes)
 * @param token - Decoded token
 * @returns True if token expires within 5 minutes
 */
export const isTokenExpiringSoon = (token: DecodedToken): boolean => {
  const expiryTime = token.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expiryTime - currentTime < fiveMinutes;
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeader,
  isTokenExpiringSoon,
};
