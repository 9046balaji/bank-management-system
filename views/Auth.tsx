
import React, { useState, useEffect } from 'react';
import { View, UserState } from '../types';
import { userApi } from '../src/services/api';

// Floating banking icons for animation
const FloatingIcon: React.FC<{
  icon: string;
  delay: number;
  duration: number;
  left: string;
  size: string;
}> = ({ icon, delay, duration, left, size }) => (
  <div
    className="absolute text-white/10 animate-float pointer-events-none"
    style={{
      left,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      bottom: '-60px',
    }}
  >
    <span className={`material-symbols-outlined ${size}`}>{icon}</span>
  </div>
);

// Animated 3D Card component
const Animated3DCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative ${className}`}>
    <div className="w-48 h-28 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl shadow-2xl transform rotate-12 hover:rotate-0 transition-all duration-700 animate-card-float">
      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
      <div className="absolute top-3 left-4">
        <div className="w-8 h-6 bg-yellow-400 rounded opacity-80"></div>
      </div>
      <div className="absolute bottom-3 left-4 text-white/80 text-xs font-mono tracking-widest">
        •••• •••• •••• 4242
      </div>
      <div className="absolute bottom-3 right-4 text-white/60 text-xs">
        AURA
      </div>
      <div className="absolute top-3 right-4">
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-red-500 rounded-full opacity-80"></div>
          <div className="w-4 h-4 bg-orange-400 rounded-full opacity-80 -ml-2"></div>
        </div>
      </div>
    </div>
  </div>
);

// Animated coin stack
const AnimatedCoins: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative ${className}`}>
    <div className="flex flex-col items-center animate-bounce-slow">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-12 h-3 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 rounded-full shadow-lg"
          style={{ marginTop: i > 0 ? '-6px' : '0' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full"></div>
        </div>
      ))}
    </div>
  </div>
);

// Security shield animation
const SecurityShield: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative ${className}`}>
    <div className="animate-pulse-slow">
      <div className="w-16 h-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-t-full rounded-b-lg opacity-30"></div>
        <div className="absolute inset-2 bg-gradient-to-b from-emerald-300 to-emerald-500 rounded-t-full rounded-b-lg opacity-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-white/80 text-2xl">verified_user</span>
        </div>
      </div>
    </div>
  </div>
);

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
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-blob animation-delay-3000"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-900/40"></div>
      </div>

      {/* Floating Banking Icons Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingIcon icon="account_balance" delay={0} duration={15} left="5%" size="text-6xl" />
        <FloatingIcon icon="credit_card" delay={2} duration={18} left="15%" size="text-5xl" />
        <FloatingIcon icon="payments" delay={4} duration={12} left="25%" size="text-4xl" />
        <FloatingIcon icon="savings" delay={1} duration={20} left="35%" size="text-5xl" />
        <FloatingIcon icon="currency_exchange" delay={3} duration={16} left="50%" size="text-6xl" />
        <FloatingIcon icon="account_balance_wallet" delay={5} duration={14} left="65%" size="text-4xl" />
        <FloatingIcon icon="trending_up" delay={2.5} duration={17} left="75%" size="text-5xl" />
        <FloatingIcon icon="security" delay={1.5} duration={19} left="85%" size="text-4xl" />
        <FloatingIcon icon="monetization_on" delay={4.5} duration={13} left="92%" size="text-5xl" />
      </div>

      {/* 3D Visual Elements - Left Side */}
      <div className="hidden lg:block absolute left-10 top-1/4 transform -translate-y-1/2">
        <Animated3DCard className="mb-8" />
        <AnimatedCoins className="ml-12" />
      </div>

      {/* 3D Visual Elements - Right Side */}
      <div className="hidden lg:block absolute right-16 bottom-1/4">
        <SecurityShield />
      </div>

      {/* Animated Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          animation: 'grid-move 20s linear infinite'
        }}></div>
      </div>

      {/* Particle Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
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
