/**
 * 3D Auth Page Component
 * 
 * A beautiful login/register page with a 3D animated background
 * featuring the vault scene with floating elements.
 */

import { useState, useMemo, useEffect, Component, ReactNode, memo } from 'react';
import VaultScene from './VaultScene';

// Memoize VaultScene to prevent re-renders when form state changes
const MemoizedVaultScene = memo(VaultScene);

// Error Boundary for 3D Canvas
interface ErrorBoundaryState {
  hasError: boolean;
}

class Canvas3DErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D Canvas Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback gradient background when 3D fails
      return (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        }} />
      );
    }
    return this.props.children;
  }
}

// Password requirement checker
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface AuthPageProps {
  onLogin?: (email: string, password: string) => Promise<void>;
  onRegister?: (name: string, email: string, password: string) => Promise<void>;
  onForgotPassword?: (email: string) => Promise<void>;
  initialMode?: 'login' | 'register' | 'forgot';
}

export default function Auth3DPage({ onLogin, onRegister, onForgotPassword, initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  // Sync mode with initialMode when it changes (e.g., navigating between login/register/forgot views)
  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setSuccessMessage(null);
  }, [initialMode]);

  // Password requirements check
  const passwordChecks = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      passed: req.test(password)
    }));
  }, [password]);

  const allPasswordRequirementsMet = useMemo(() => {
    return passwordChecks.every(check => check.passed);
  }, [passwordChecks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!onLogin) {
          throw new Error('Login handler not provided');
        }
        await onLogin(email, password);
      } else if (mode === 'forgot') {
        // Handle forgot password
        if (onForgotPassword) {
          await onForgotPassword(email);
        }
        // Show success message and redirect to login after delay
        setSuccessMessage('Password reset link sent to your email');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 3000);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (!allPasswordRequirementsMet) {
          throw new Error('Password does not meet all requirements');
        }
        if (!onRegister) {
          throw new Error('Register handler not provided');
        }
        await onRegister(name, email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      // Handle network errors specifically
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        setError('Unable to connect to server. Please check if the backend is running on port 5000.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* 3D Background with Error Boundary - Memoized to prevent re-renders */}
      <Canvas3DErrorBoundary>
        <MemoizedVaultScene />
      </Canvas3DErrorBoundary>

      {/* Scrollable container for auth card */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        boxSizing: 'border-box',
        minHeight: '100vh'
      }}>
        {/* Glass morphism auth card */}
        <div style={{
          width: '100%',
          maxWidth: 420,
          padding: 40,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 24,
          border: '1px solid rgba(14, 165, 233, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 80px rgba(14, 165, 233, 0.1)',
          zIndex: 10,
          margin: 'auto'
        }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            borderRadius: 16,
            marginBottom: 16,
            boxShadow: '0 10px 30px rgba(14, 165, 233, 0.3)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'white',
            margin: 0,
            background: 'linear-gradient(135deg, #ffffff, #94a3b8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Aura Bank
          </h1>
          <p style={{
            color: '#94a3b8',
            margin: '8px 0 0',
            fontSize: 14
          }}>
            {mode === 'login' ? 'Welcome back! Sign in to continue' : mode === 'register' ? 'Create your secure account' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#86efac',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            textAlign: 'center'
          }}>
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: 14,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: 14,
                marginBottom: 8,
                fontWeight: 500
              }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                placeholder="John Doe"
              />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: 14,
              marginBottom: 8,
              fontWeight: 500
            }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: 12,
                color: 'white',
                fontSize: 16,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              placeholder="you@example.com"
            />
          </div>

          {mode !== 'forgot' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              color: '#94a3b8',
              fontSize: 14,
              marginBottom: 8,
              fontWeight: 500
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => mode === 'register' && setShowPasswordRequirements(true)}
              onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
              required
              minLength={8}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${mode === 'register' && password && !allPasswordRequirementsMet ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)'}`,
                borderRadius: 12,
                color: 'white',
                fontSize: 16,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
            />
            
            {/* Password Requirements Display - Only show in register mode */}
            {mode === 'register' && (showPasswordRequirements || password) && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 10,
                border: '1px solid rgba(148, 163, 184, 0.1)'
              }}>
                <p style={{
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Password Requirements:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {passwordChecks.map((check, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        color: check.passed ? '#10b981' : '#94a3b8',
                        transition: 'color 0.2s ease'
                      }}
                    >
                      <span style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: check.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                        fontSize: 12,
                        transition: 'all 0.2s ease'
                      }}>
                        {check.passed ? '✓' : '○'}
                      </span>
                      {check.label}
                    </div>
                  ))}
                </div>
                {allPasswordRequirementsMet && (
                  <div style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    borderRadius: 8,
                    color: '#10b981',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span>✓</span> Strong password!
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {mode === 'register' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                color: '#94a3b8',
                fontSize: 14,
                marginBottom: 8,
                fontWeight: 500
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === 'login' && (
            <div style={{ 
              textAlign: 'right', 
              marginBottom: 20 
            }}>
              <button 
                type="button"
                onClick={() => { setMode('forgot'); setError(null); setSuccessMessage(null); }}
                style={{ 
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9', 
                  fontSize: 14, 
                  textDecoration: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading 
                ? 'rgba(14, 165, 233, 0.5)' 
                : 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              border: 'none',
              borderRadius: 12,
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 10px 30px rgba(14, 165, 233, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Processing...
              </>
            ) : (
              mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'
            )}
          </button>
        </form>

        {/* Toggle mode */}
        <p style={{
          textAlign: 'center',
          color: '#94a3b8',
          marginTop: 24,
          fontSize: 14
        }}>
          {mode === 'forgot' ? (
            <>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); setSuccessMessage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  fontSize: 14
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={toggleMode}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  fontWeight: 600,
                  padding: 0,
                  fontSize: 14
                }}
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </>
          )}
        </p>

        {/* Security badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginTop: 24,
          padding: '12px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: 8,
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span style={{ color: '#22c55e', fontSize: 12 }}>
            256-bit SSL Encrypted · Bank-grade Security
          </span>
        </div>
      </div>
      </div>

      {/* Custom styles for animations */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        input:focus {
          border-color: #0ea5e9 !important;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(14, 165, 233, 0.4) !important;
        }
        
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
