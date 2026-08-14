
import React from 'react';

interface LandingProps {
  onStart: () => void;
  onLogin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-fade-in">
      <nav className="px-6 md:px-20 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-3xl">account_balance</span>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Aura Bank</span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onLogin}
            className="px-4 py-2 text-slate-500 dark:text-slate-300 font-bold hover:text-primary transition-colors"
          >
            Login
          </button>
          <button onClick={onStart} className="bg-primary hover:bg-primary-hover active:scale-95 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg shadow-primary/25">
            Get Started
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto">
        <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 animate-slide-up">
          Next Gen Banking is Here
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight animate-slide-up" style={{animationDelay: '0.1s'}}>
          Secure Banking for the <span className="text-primary">Digital Age</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl leading-relaxed animate-slide-up" style={{animationDelay: '0.2s'}}>
          Experience the future of finance with AI-driven insights, zero-latency transfers, and military-grade security. Join 10M+ users today.
        </p>
        
        <div className="flex flex-wrap gap-4 justify-center animate-slide-up" style={{animationDelay: '0.3s'}}>
          <button 
            onClick={onStart}
            className="h-14 px-10 bg-primary hover:bg-primary-hover active:scale-95 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center gap-2 transform hover:scale-105"
          >
            Open Account Now <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button className="h-14 px-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all">
            Learn More
          </button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full animate-slide-up" style={{animationDelay: '0.5s'}}>
          {[
            { icon: 'speed', title: 'Instant Transfers', desc: 'Move money across the globe in seconds.' },
            { icon: 'psychology', title: 'AI-Powered Loans', desc: 'Get approval instantly based on real-time health.' },
            { icon: 'verified_user', title: 'Safe & Secure', desc: 'Biometric security & FDIC insured up to $250k.' }
          ].map((feat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-left group hover:border-primary transition-all hover:-translate-y-2 duration-300">
              <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                <span className="material-symbols-outlined">{feat.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
              <p className="text-slate-500 dark:text-slate-400">{feat.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-10 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
        © 2024 Aura Bank Financial Services. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
