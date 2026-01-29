/**
 * Secret Management Utilities
 * Validates required environment variables and provides secure access
 */

// Required environment variables for production
const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_PASSWORD',
  'ENCRYPTION_KEY',
] as const;

// Optional but recommended secrets
const RECOMMENDED_SECRETS = [
  'GEMINI_API_KEY',
  'HUGGINGFACE_API_KEY',
] as const;

interface SecretValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates that all required secrets are set
 * Should be called at application startup
 */
export function validateSecrets(): SecretValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required secrets
  for (const key of REQUIRED_SECRETS) {
    const value = process.env[key];
    
    if (!value) {
      missing.push(key);
    } else if (value.includes('change-in-production') || value.includes('default')) {
      warnings.push(`${key} appears to be using a default/placeholder value`);
    } else if (value.length < 32 && (key.includes('SECRET') || key.includes('KEY'))) {
      warnings.push(`${key} should be at least 32 characters for security`);
    }
  }

  // Check recommended secrets (warnings only)
  for (const key of RECOMMENDED_SECRETS) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set - some features may be limited`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Throws an error if required secrets are missing in production
 */
export function enforceSecrets(): void {
  const result = validateSecrets();
  
  if (process.env.NODE_ENV === 'production') {
    if (!result.valid) {
      console.error('❌ Missing required environment variables:');
      result.missing.forEach(key => console.error(`   - ${key}`));
      throw new Error(`Missing required secrets: ${result.missing.join(', ')}`);
    }
    
    if (result.warnings.length > 0) {
      console.warn('⚠️ Security warnings:');
      result.warnings.forEach(warning => console.warn(`   - ${warning}`));
    }
  } else {
    // In development, just log warnings
    if (!result.valid) {
      console.warn('⚠️ Missing environment variables (using defaults for development):');
      result.missing.forEach(key => console.warn(`   - ${key}`));
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.warn(`   ℹ️ ${warning}`));
    }
  }
}

/**
 * Get a secret value with validation
 * Throws if the secret is required but not set in production
 */
export function getSecret(key: string, required = true): string | undefined {
  const value = process.env[key];
  
  if (!value && required && process.env.NODE_ENV === 'production') {
    throw new Error(`Required secret ${key} is not set`);
  }
  
  return value;
}

/**
 * Generate a secure random secret for development
 * NOT for production use - production secrets should come from secure storage
 */
export function generateDevSecret(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  
  return result;
}

export default {
  validateSecrets,
  enforceSecrets,
  getSecret,
  generateDevSecret,
};
