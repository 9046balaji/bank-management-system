
import React, { useState, useEffect } from 'react';
import { UserState, Loan } from '../types';
import { loanApi, mlApi } from '../src/services/api';

interface LoansProps {
  user: UserState;
  onPayment: (amount: number) => void;
}

interface LoanData {
  id: string;
  loan_type: string;
  principal_amount: number;
  remaining_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  next_emi_date: string;
  emi_amount: number;
  status: string;
  paid_emis: number;
}

const Loans: React.FC<LoansProps> = ({ user, onPayment }) => {
  const [view, setView] = useState<'TRACKING' | 'APPLICATION' | 'CALCULATOR'>('TRACKING');
  const [loans, setLoans] = useState<Loan[]>(user.loans);
  const [loading, setLoading] = useState(false);
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Application State
  const [loanAmount, setLoanAmount] = useState(25000);
  const [term, setTerm] = useState(24);
  const [aiAnalysis, setAiAnalysis] = useState('Adjust sliders for real-time AI risk analysis.');
  const [confidence, setConfidence] = useState(85);
  const [aiLoading, setAiLoading] = useState(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(10000);
  const [calcRate, setCalcRate] = useState<number>(5.5);
  const [calcTerm, setCalcTerm] = useState<number>(12);
  const [calcMonthly, setCalcMonthly] = useState<number>(0);

  // Fetch loans on mount
  useEffect(() => {
    const fetchLoans = async () => {
      if (!user.id) return;
      setLoading(true);
      try {
        const response = await loanApi.getByUserId(user.id);
        if (response.success && response.data) {
          const loanData = response.data as LoanData[];
          setLoans(loanData.map((loan: LoanData) => ({
            id: loan.id,
            type: loan.loan_type || 'Personal',
            amount: parseFloat(String(loan.principal_amount)),
            remaining: parseFloat(String(loan.remaining_amount || loan.principal_amount)),
            interestRate: parseFloat(String(loan.interest_rate)),
            termMonths: loan.term_months,
            startDate: loan.start_date,
            nextEmiDate: loan.next_emi_date || '',
            emiAmount: parseFloat(String(loan.emi_amount)) || 0,
            status: (loan.status as 'ACTIVE' | 'PENDING' | 'REPAID') || 'ACTIVE',
          })));
        }
      } catch (error) {
        console.error('Error fetching loans:', error);
        // Fall back to user.loans
        setLoans(user.loans);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, [user.id]);

  // Update loans when user.loans changes
  useEffect(() => {
    if (user.loans.length > 0 && loans.length === 0) {
      setLoans(user.loans);
    }
  }, [user.loans]);

  // Fetch AI analysis when application parameters change
  useEffect(() => {
    if (view === 'APPLICATION') {
      const fetchAiAnalysis = async () => {
        setAiLoading(true);
        try {
          // Use ML API for loan prediction
          const mlResponse = await mlApi.predictLoan({
            Gender: 'Male',
            Married: 'Yes',
            Dependents: '0',
            Education: 'Graduate',
            Self_Employed: 'No',
            ApplicantIncome: 8000,
            CoapplicantIncome: 0,
            LoanAmount: loanAmount / 1000, // ML model expects in thousands
            Loan_Amount_Term: term * 30, // Convert months to days
            Credit_History: 1,
            Property_Area: 'Urban',
          });

          if (mlResponse.success) {
            const data = mlResponse as {
              success: boolean;
              is_approved?: boolean;
              approval_probability?: number;
              risk_factors?: string[];
              recommendation?: string;
            };
            const probability = data.approval_probability || 0.85;
            setConfidence(Math.round(probability * 100));
            
            if (data.is_approved) {
              if (probability > 0.9) {
                setAiAnalysis(`Excellent approval likelihood (${Math.round(probability * 100)}%). ${data.recommendation || 'Your profile meets all criteria.'}`);
              } else if (probability > 0.75) {
                setAiAnalysis(`Good approval chances (${Math.round(probability * 100)}%). ${data.recommendation || 'Consider a co-applicant to improve terms.'}`);
              } else {
                setAiAnalysis(`Moderate approval likelihood (${Math.round(probability * 100)}%). ${data.risk_factors?.join(', ') || 'Review your credit history.'}`);
              }
            } else {
              setAiAnalysis(`Lower approval probability (${Math.round(probability * 100)}%). ${data.risk_factors?.join(', ') || 'Consider reducing loan amount or improving credit score.'}`);
            }
            return;
          }

          // Fallback to legacy backend AI analysis
          const response = await loanApi.getAiAnalysis('new', {
            loan_amount: loanAmount,
            credit_score: 750,
            monthly_income: 8000,
          });

          if (response.success && response.data) {
            const data = response.data as { risk_score?: number; analysis?: string };
            setConfidence(data.risk_score || 85);
            setAiAnalysis(data.analysis || 'Analysis complete.');
          } else {
            calculateLocalAnalysis();
          }
        } catch (error) {
          // Fallback to local calculation
          calculateLocalAnalysis();
        } finally {
          setAiLoading(false);
        }
      };

      // Debounce the API call
      const timeoutId = setTimeout(fetchAiAnalysis, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [loanAmount, term, view]);

  const calculateLocalAnalysis = () => {
    const baseScore = 95;
    const amountImpact = (loanAmount / 50000) * 15;
    const termImpact = (term / 60) * 5;
    const finalScore = Math.round(baseScore - amountImpact + termImpact);
    setConfidence(finalScore);
    
    if (finalScore > 90) setAiAnalysis('Excellent profile. Debt-to-income ratio is very healthy.');
    else if (finalScore > 80) setAiAnalysis('High likelihood. Monthly income supports requested installment.');
    else setAiAnalysis('Caution advised. Extending term to 30+ months increases approval score.');
  };

  // Calculator Logic - use backend if available
  useEffect(() => {
    const calculateEmi = async () => {
      try {
        const response = await loanApi.calculate({
          principal: calcAmount,
          rate: calcRate,
          term_months: calcTerm,
        });

        if (response.success && response.data) {
          const data = response.data as { emi?: number; monthly_payment?: number };
          setCalcMonthly(data.emi || data.monthly_payment || 0);
          return;
        }
      } catch (error) {
        // Fall back to local calculation
      }

      // Local calculation
      const monthlyRate = calcRate / 100 / 12;
      if (monthlyRate === 0) {
        setCalcMonthly(calcAmount / calcTerm);
      } else {
        const factor = Math.pow(1 + monthlyRate, calcTerm);
        const emi = (calcAmount * monthlyRate * factor) / (factor - 1);
        setCalcMonthly(emi);
      }
    };

    calculateEmi();
  }, [calcAmount, calcRate, calcTerm]);

  // Pay EMI
  const handlePayEmi = async (loan: Loan) => {
    setPayingLoanId(loan.id);
    try {
      // Call backend to pay EMI
      const response = await loanApi.payEmi(loan.id, user.id || '', loan.emiAmount);
      
      if (response.success) {
        // Update local state
        onPayment(loan.emiAmount);
        
        // Refresh loans
        const loansResponse = await loanApi.getByUserId(user.id || '');
        if (loansResponse.success && loansResponse.data) {
          const loanData = loansResponse.data as LoanData[];
          setLoans(loanData.map((l: LoanData) => ({
            id: l.id,
            type: l.loan_type || 'Personal',
            amount: parseFloat(String(l.principal_amount)),
            remaining: parseFloat(String(l.remaining_amount || l.principal_amount)),
            interestRate: parseFloat(String(l.interest_rate)),
            termMonths: l.term_months,
            startDate: l.start_date,
            nextEmiDate: l.next_emi_date || '',
            emiAmount: parseFloat(String(l.emi_amount)) || 0,
            status: (l.status as 'ACTIVE' | 'PENDING' | 'REPAID') || 'ACTIVE',
          })));
        }
        alert('EMI payment successful!');
      } else {
        // Fallback to local update
        onPayment(loan.emiAmount);
      }
    } catch (error) {
      console.error('Error paying EMI:', error);
      // Fallback to local update
      onPayment(loan.emiAmount);
    } finally {
      setPayingLoanId(null);
    }
  };

  // Submit loan application
  const handleSubmitApplication = async () => {
    if (!user.id) {
      alert('Please log in to apply for a loan');
      return;
    }

    setSubmitting(true);
    try {
      const response = await loanApi.applyForLoan({
        user_id: user.id,
        requested_amount: loanAmount,
        monthly_income: 8000, // Could get from user profile
        credit_score: 750, // Could get from user profile
        ai_risk_score: confidence,
      });

      if (response.success) {
        alert('Loan application submitted successfully! You will be notified once it is reviewed.');
        setView('TRACKING');
      } else {
        alert(response.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate repayment percentage
  const getRepaymentPercentage = (loan: Loan) => {
    const paid = loan.amount - loan.remaining;
    return Math.round((paid / loan.amount) * 100);
  };

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
           {loading ? (
             <div className="flex items-center justify-center py-12">
               <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
             </div>
           ) : loans.length === 0 ? (
             <div className="bg-surface-light dark:bg-surface-dark p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
               <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">credit_score</span>
               <h3 className="text-xl font-bold mb-2">No Active Loans</h3>
               <p className="text-slate-500 mb-6">You don't have any active loans. Apply for a new loan to get started.</p>
               <button
                 onClick={() => setView('APPLICATION')}
                 className="px-8 h-12 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
               >
                 Apply for Loan
               </button>
             </div>
           ) : (
             loans.map(loan => (
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
                           <p className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded mt-1">Due {loan.nextEmiDate ? new Date(loan.nextEmiDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <p className="text-2xl font-black text-primary">{getRepaymentPercentage(loan)}% <span className="text-sm font-bold text-slate-400">Repaid</span></p>
                          <p className="text-xs font-bold text-slate-500">Remaining: <span className="text-slate-900 dark:text-white">${loan.remaining.toLocaleString()}</span></p>
                        </div>
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-500" style={{width: `${getRepaymentPercentage(loan)}%`}}></div>
                        </div>
                     </div>

                     <div className="flex justify-end gap-4">
                        <button className="px-6 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm">Statement</button>
                        <button 
                          onClick={() => handlePayEmi(loan)}
                          disabled={payingLoanId === loan.id}
                          className="px-8 h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                        >
                          {payingLoanId === loan.id ? (
                            <span className="material-symbols-outlined animate-spin">refresh</span>
                          ) : (
                            <>Pay EMI Now <span className="material-symbols-outlined">arrow_forward</span></>
                          )}
                        </button>
                     </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                     <h4 className="font-bold mb-6 flex items-center gap-2">
                       <span className="material-symbols-outlined text-slate-400">info</span> Loan Details
                     </h4>
                     <div className="space-y-4 text-sm">
                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Loan Type</span>
                          <span className="font-bold">{loan.type}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Interest Rate</span>
                          <span className="font-bold">{loan.interestRate}% p.a.</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Loan Term</span>
                          <span className="font-bold">{loan.termMonths} Months</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-slate-500">Status</span>
                          <span className={`font-bold ${loan.status === 'ACTIVE' ? 'text-success' : loan.status === 'PENDING' ? 'text-warning' : 'text-slate-500'}`}>{loan.status}</span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-slate-500">Penalty Due</span>
                          <span className="font-bold">$0.00</span>
                        </div>
                     </div>
                  </div>
               </div>
             ))
           )}
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

              <button 
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
                ) : (
                  'Submit Application'
                )}
              </button>
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
                      {aiLoading && <span className="material-symbols-outlined text-xs animate-spin ml-2">refresh</span>}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {aiLoading ? 'Analyzing your application...' : aiAnalysis}
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
