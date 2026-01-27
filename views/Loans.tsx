
import React, { useState, useEffect } from 'react';
import { UserState, Loan } from '../types';
import { GoogleGenAI } from "@google/genai";

interface LoansProps {
  user: UserState;
  onPayment: (amount: number) => void;
}

const Loans: React.FC<LoansProps> = ({ user, onPayment }) => {
  const [view, setView] = useState<'TRACKING' | 'APPLICATION' | 'CALCULATOR'>('TRACKING');
  
  // Application State
  const [loanAmount, setLoanAmount] = useState(25000);
  const [term, setTerm] = useState(24);
  const [aiAnalysis, setAiAnalysis] = useState('Adjust sliders for real-time AI risk analysis.');
  const [confidence, setConfidence] = useState(85);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(10000);
  const [calcRate, setCalcRate] = useState<number>(5.5);
  const [calcTerm, setCalcTerm] = useState<number>(12);
  const [calcMonthly, setCalcMonthly] = useState<number>(0);

  // Simulated AI Logic for the application view
  useEffect(() => {
    if (view === 'APPLICATION') {
      const baseScore = 95;
      const amountImpact = (loanAmount / 50000) * 15;
      const termImpact = (term / 60) * 5;
      const finalScore = Math.round(baseScore - amountImpact + termImpact);
      setConfidence(finalScore);
      
      if (finalScore > 90) setAiAnalysis('Excellent profile. Debt-to-income ratio is very healthy.');
      else if (finalScore > 80) setAiAnalysis('High likelihood. Monthly income supports requested installment.');
      else setAiAnalysis('Caution advised. Extending term to 30+ months increases approval score.');
    }
  }, [loanAmount, term, view]);

  // Calculator Logic
  useEffect(() => {
    const monthlyRate = calcRate / 100 / 12;
    if (monthlyRate === 0) {
        setCalcMonthly(calcAmount / calcTerm);
    } else {
        const factor = Math.pow(1 + monthlyRate, calcTerm);
        const emi = (calcAmount * monthlyRate * factor) / (factor - 1);
        setCalcMonthly(emi);
    }
  }, [calcAmount, calcRate, calcTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Loan Center</h2>
          <p className="text-slate-500">Track active loans, apply for funding, or calculate payments.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl overflow-x-auto">
           <button 
            onClick={() => setView('TRACKING')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'TRACKING' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-500'}`}
           >
             Active Loans
           </button>
           <button 
            onClick={() => setView('CALCULATOR')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'CALCULATOR' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-500'}`}
           >
             Calculator
           </button>
           <button 
            onClick={() => setView('APPLICATION')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'APPLICATION' ? 'bg-white dark:bg-slate-700 shadow-md text-primary' : 'text-slate-500'}`}
           >
             New Application
           </button>
        </div>
      </div>

      {view === 'TRACKING' && (
        <div className="space-y-8 animate-in slide-in-from-left-4">
           {user.loans.map(loan => (
             <div key={loan.id} className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-8 relative overflow-hidden">
                <div className="lg:col-span-2 space-y-8 relative z-10">
                   <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Outstanding Balance</p>
                        <h3 className="text-5xl font-black text-primary">${loan.remaining.toLocaleString()}</h3>
                        <p className="text-sm text-slate-500 mt-2">of ${loan.amount.toLocaleString()} Total Loan Amount</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Next EMI Due</p>
                         <p className="text-xl font-bold">${loan.emiAmount}</p>
                         <p className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded mt-1">Due {new Date(loan.nextEmiDate).toLocaleDateString()}</p>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <p className="text-2xl font-black text-primary">34% <span className="text-sm font-bold text-slate-400">Repaid</span></p>
                        <p className="text-xs font-bold text-slate-500">Remaining: <span className="text-slate-900 dark:text-white">${loan.remaining.toLocaleString()}</span></p>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{width: '34%'}}></div>
                      </div>
                   </div>

                   <div className="flex justify-end gap-4">
                      <button className="px-6 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm">Statement</button>
                      <button 
                        onClick={() => onPayment(loan.emiAmount)}
                        className="px-8 h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                        Pay EMI Now <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                   </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                   <h4 className="font-bold mb-6 flex items-center gap-2">
                     <span className="material-symbols-outlined text-slate-400">info</span> Loan Details
                   </h4>
                   <div className="space-y-4 text-sm">
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Interest Rate</span>
                        <span className="font-bold">{loan.interestRate}% p.a.</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Loan Term</span>
                        <span className="font-bold">{loan.termMonths} Months</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-500">Last Payment</span>
                        <span className="font-bold text-success">$450.00</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-500">Penalty Due</span>
                        <span className="font-bold">$0.00</span>
                      </div>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {view === 'CALCULATOR' && (
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm animate-in zoom-in-95">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">calculate</span> Payment Estimator
              </h3>
              
              <div className="space-y-4">
                <div>
                   <label className="text-sm font-bold text-slate-500">Loan Amount</label>
                   <div className="relative mt-1">
                      <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={calcAmount} 
                        onChange={e => setCalcAmount(Number(e.target.value))}
                        className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none" 
                      />
                   </div>
                </div>
                <div>
                   <label className="text-sm font-bold text-slate-500">Interest Rate (%)</label>
                   <div className="relative mt-1">
                      <input 
                        type="number" 
                        step="0.1"
                        value={calcRate} 
                        onChange={e => setCalcRate(Number(e.target.value))}
                        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none" 
                      />
                   </div>
                </div>
                <div>
                   <label className="text-sm font-bold text-slate-500">Loan Term (Months)</label>
                   <input 
                     type="range" 
                     min="12" 
                     max="360" 
                     step="12"
                     value={calcTerm}
                     onChange={e => setCalcTerm(Number(e.target.value))}
                     className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-primary mt-3 mb-2"
                   />
                   <div className="text-right font-bold text-primary">{calcTerm} Months ({calcTerm/12} Years)</div>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 dark:bg-slate-800/50 rounded-2xl p-8 flex flex-col justify-center items-center text-center space-y-2 border border-primary/10 dark:border-slate-700">
               <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Estimated Monthly Payment</p>
               <h3 className="text-6xl font-black text-primary">${calcMonthly.toFixed(2)}</h3>
               <p className="text-xs text-slate-400">Total Interest: ${((calcMonthly * calcTerm) - calcAmount).toFixed(2)}</p>
               <button className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Apply for this Loan</button>
            </div>
          </div>
        </div>
      )}

      {view === 'APPLICATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-8">
           <div className="lg:col-span-7 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
              <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-primary">psychology</span>
                 <h3 className="text-2xl font-black">AI Loan Application</h3>
              </div>

              <div className="space-y-8">
                 <div className="space-y-4">
                    <div className="flex justify-between">
                       <label className="text-sm font-bold">Loan Amount ($)</label>
                       <span className="text-xl font-black text-primary">${loanAmount.toLocaleString()}</span>
                    </div>
                    <input 
                      type="range" min="5000" max="50000" step="1000" 
                      value={loanAmount} onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-primary"
                    />
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between">
                       <label className="text-sm font-bold">Repayment Period</label>
                       <span className="text-xl font-black text-primary">{term} Months</span>
                    </div>
                    <input 
                      type="range" min="12" max="60" step="6" 
                      value={term} onChange={(e) => setTerm(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-primary"
                    />
                 </div>
              </div>

              <button className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20">Submit Application</button>
           </div>

           <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center space-y-6">
                 <h4 className="font-bold uppercase text-xs tracking-widest text-slate-400">Approval Likelihood</h4>
                 <div className="relative size-40 mx-auto">
                    <svg className="size-full transform -rotate-90">
                       <circle cx="80" cy="80" r="70" className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="12" />
                       <circle cx="80" cy="80" r="70" className="stroke-primary fill-none transition-all duration-500" strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 - (440 * confidence / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className="text-4xl font-black">{confidence}%</span>
                       <span className="text-[10px] font-bold uppercase text-slate-400">Score</span>
                    </div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <p className="text-[10px] font-bold uppercase text-primary mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">auto_awesome</span> AI Risk Analysis
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {aiAnalysis}
                    </p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
