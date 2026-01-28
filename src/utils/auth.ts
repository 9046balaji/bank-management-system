/**
 * Authentication Utilities
 * Secure token management using HttpOnly cookies
 * 
 * Note: With HttpOnly cookie-based auth:
 * - Access tokens are stored in HttpOnly cookies (set by backend)
 * - Frontend doesn't directly access tokens
 * - credentials: 'include' is used for all requests
 * - Backend validates tokens from cookies
 */

// Session storage key (for UI state only, not actual token)
export const SESSION_STATE_KEY = 'aura_auth_state';

// Auth state interface (no sensitive data)
interface AuthState {
  isAuthenticated: boolean;
  lastActivity: number;
}

/**
 * Get the current auth state (UI state only)
 * The actual token is managed by HttpOnly cookies
 */
export function getAuthState(): AuthState | null {
  try {
    const state = sessionStorage.getItem(SESSION_STATE_KEY);
    if (!state) return null;
    return JSON.parse(state);
  } catch {
    return null;
  }
}

/**
 * Save auth state (UI state only)
 * Called after successful login
 */
export function saveAuthState(): void {
  const state: AuthState = {
    isAuthenticated: true,
    lastActivity: Date.now(),
  };
  sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
}

/**
 * Clear auth state
 * Called on logout
 */
export function clearAuthState(): void {
  sessionStorage.removeItem(SESSION_STATE_KEY);
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity(): void {
  const state = getAuthState();
  if (state) {
    state.lastActivity = Date.now();
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
  }
}

/**
 * Check if session is still valid based on inactivity
 * @param maxInactiveMinutes - Maximum allowed inactive time in minutes
 */
export function isSessionValid(maxInactiveMinutes: number = 30): boolean {
  const state = getAuthState();
  if (!state) return false;
  
  const inactiveTime = Date.now() - state.lastActivity;
  const maxInactiveTime = maxInactiveMinutes * 60 * 1000;
  
  return inactiveTime < maxInactiveTime;
}

/**
 * Generate a client-side request ID for tracking
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate an idempotency key for transaction requests
 */
export function generateIdempotencyKey(prefix: string = 'tx'): string {
  return `${prefix}-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).substring(2)}`;
}

export default {
  getAuthState,
  saveAuthState,
  clearAuthState,
  updateLastActivity,
  isSessionValid,
  generateRequestId,
  generateIdempotencyKey,
};
