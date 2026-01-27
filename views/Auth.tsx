
import React, { useState } from 'react';
import { View, UserState } from '../types';
import { userApi } from '../src/services/api';

interface AuthProps {
  currentView: View;
  setView: (v: View) => void;
  onLogin: (userData: any) => void;
}

// Types for API responses
interface RegisterResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  kyc_status: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    kyc_status: string;
    accounts?: Array<{ id: string; balance: number; account_number: string }>;
    transactions?: any[];
    loans?: any[];
    cards?: any[];
    tickets?: any[];
  };
  token: string;
}

const Auth: React.FC<AuthProps> = ({ currentView, setView, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (currentView === View.REGISTER) {
        // Register new user
        const response = await userApi.register({
          full_name: name,
          email,
          password,
        });

        if (response.success && response.data) {
          const data = response.data as RegisterResponse;
          // After registration, pass user data and go to KYC
          onLogin({
            id: data.id,
            email: data.email,
            name: data.full_name,
            kyc_status: 'PENDING',
            isNewUser: true,
          });
        } else {
          setError(response.error || 'Registration failed');
        }
      } else if (currentView === View.LOGIN) {
        // Login existing user
        const response = await userApi.login(email, password);

        if (response.success && response.data) {
          const loginData = response.data as LoginResponse;
          // Transform backend data to frontend format
          onLogin({
            id: loginData.user.id,
            email: loginData.user.email,
            name: loginData.user.full_name,
            role: loginData.user.role,
            kyc_status: loginData.user.kyc_status,
            balance: loginData.user.accounts?.[0]?.balance || 0,
            accounts: loginData.user.accounts || [],
            transactions: loginData.user.transactions || [],
            loans: loginData.user.loans || [],
            cards: loginData.user.cards || [],
            tickets: loginData.user.tickets || [],
            token: loginData.token,
          });
        } else {
          setError(response.error || 'Invalid email or password');
        }
      } else {
        // Forgot password - just show success message
        setError('Password reset link sent to your email');
        setTimeout(() => {
          setView(View.LOGIN);
          setError(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-900/40"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-6">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl animate-fade-in animate-tilt">
          <div className="text-center mb-8">
            <div className="size-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-3xl text-white">account_balance</span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">
              {currentView === View.LOGIN && 'Welcome Back'}
              {currentView === View.REGISTER && 'Create Account'}
              {currentView === View.FORGOT_PASSWORD && 'Reset Password'}
            </h2>
            <p className="text-slate-300">
              {currentView === View.LOGIN && 'Enter your credentials to access your account.'}
              {currentView === View.REGISTER && 'Join 10M+ users banking with Aura.'}
              {currentView === View.FORGOT_PASSWORD && 'Enter your email to receive a reset link.'}
            </p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              error.includes('sent') 
                ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                : 'bg-red-500/20 border border-red-500/30 text-red-300'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {currentView === View.REGISTER && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                placeholder="name@example.com"
                required
              />
            </div>

            {currentView !== View.FORGOT_PASSWORD && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Password</label>
                  {currentView === View.LOGIN && (
                    <button 
                      type="button" 
                      onClick={() => setView(View.FORGOT_PASSWORD)}
                      className="text-xs font-bold text-primary hover:text-blue-400 transition-colors"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  {currentView === View.LOGIN && 'Sign In'}
                  {currentView === View.REGISTER && 'Create Account'}
                  {currentView === View.FORGOT_PASSWORD && 'Send Reset Link'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            {currentView === View.LOGIN ? (
              <p className="text-slate-400 text-sm">
                Don't have an account? <button onClick={() => setView(View.REGISTER)} className="text-white font-bold hover:underline">Sign up</button>
              </p>
            ) : (
              <p className="text-slate-400 text-sm">
                Already have an account? <button onClick={() => setView(View.LOGIN)} className="text-white font-bold hover:underline">Log in</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default Auth;
