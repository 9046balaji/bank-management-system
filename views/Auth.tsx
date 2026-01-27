
import React, { useState } from 'react';
import { View } from '../types';

interface AuthProps {
  currentView: View;
  setView: (v: View) => void;
  onLogin: (email: string) => void;
}

const Auth: React.FC<AuthProps> = ({ currentView, setView, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate network request
    setTimeout(() => {
      setLoading(false);
      if (currentView === View.REGISTER) {
        // In a real app, this would register then auto-login or redirect to login
        // For this demo, we go straight to KYC
        onLogin(email); 
      } else if (currentView === View.LOGIN) {
        onLogin(email);
      } else {
        // Forgot password
        setView(View.LOGIN);
      }
    }, 1500);
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
