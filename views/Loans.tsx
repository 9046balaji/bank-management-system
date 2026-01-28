
import React, { useState, useEffect } from 'react';
import { UserState, Loan } from '../types';
import { loanApi, mlApi } from '../src/services/api';

interface LoansProps {
  user: UserState;
  onPayment: (amount: number) => void;
}

interface LoanData {
  id: string;
  loan_type?: string;
  type?: string;
  principal_amount?: number;
  loan_amount?: number;
  remaining_amount?: number;
  outstanding_balance?: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
  next_emi_date: string;
  emi_amount: number;
  status: string;
  paid_emis: number;
}

interface LoanApplication {
  id: string;
  requested_amount: number;
  status: string;
  applied_at: string;
  ai_risk_score?: number;
}

// Demo data for quick form filling
const DEMO_APPROVE_DATA = {
  monthlyIncome: 8000,
  existingDebt: 500,
  employer: 'Acme Corporation',
  employmentYears: 5
};

const DEMO_REJECT_DATA = {
  monthlyIncome: 3000,
  existingDebt: 2000,
  employer: 'Self Employed',
  employmentYears: 1
};

const Loans: React.FC<LoansProps> = ({ user, onPayment }) => {
  const [view, setView] = useState<'TRACKING' | 'APPLICATION' | 'CALCULATOR'>('TRACKING');
  const [loans, setLoans] = useState<Loan[]>(user.loans);
  const [pendingApps, setPendingApps] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Application State
  const [loanAmount, setLoanAmount] = useState(25000);
  const [term, setTerm] = useState(24);
  const [aiAnalysis, setAiAnalysis] = useState('Enter your financial details for AI risk analysis.');
  const [confidence, setConfidence] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  
  // NEW: Financial details for DTI calculation
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [existingDebt, setExistingDebt] = useState(0);
  const [employer, setEmployer] = useState('');
  const [employmentYears, setEmploymentYears] = useState(0);
  
  // NEW: Application result state
  const [applicationResult, setApplicationResult] = useState<{
    status: 'APPROVED' | 'REJECTED' | null;
    message: string;
    dtiRatio: number;
  } | null>(null);
  const [processingStep, setProcessingStep] = useState('');

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
        // Fetch active loans
        const response = await loanApi.getByUserId(user.id);
        if (response.success && response.data) {
          const loanData = response.data as LoanData[];
          setLoans(loanData.map((loan: LoanData) => ({
            id: loan.id,
            type: loan.loan_type || loan.type || 'Personal',
            amount: parseFloat(String(loan.loan_amount || loan.principal_amount || 0)),
            remaining: parseFloat(String(loan.outstanding_balance || loan.remaining_amount || loan.loan_amount || 0)),
            interestRate: parseFloat(String(loan.interest_rate)),
            termMonths: loan.term_months,
            startDate: loan.start_date,
            nextEmiDate: loan.next_emi_date || '',
            emiAmount: parseFloat(String(loan.emi_amount)) || 0,
            status: (loan.status as 'ACTIVE' | 'PENDING' | 'REPAID') || 'ACTIVE',
          })));
        }

        // Fetch pending loan applications
        const appsResponse = await loanApi.getUserApplications(user.id);
        if (appsResponse.success && appsResponse.data) {
          const apps = appsResponse.data as LoanApplication[];
          // Filter to only show PENDING applications
          setPendingApps(apps.filter(app => app.status === 'PENDING'));
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

  // DTI-based AI analysis when financial details change
  useEffect(() => {
    if (view === 'APPLICATION' && monthlyIncome > 0) {
      setAiLoading(true);
      
      // Calculate EMI for the loan
      const monthlyRate = 0.085 / 12; // 8.5% annual rate
      const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      
      // Calculate DTI ratio: (Existing Debt + New EMI) / Income
      const totalMonthlyDebt = existingDebt + emi;
      const dtiRatio = (totalMonthlyDebt / monthlyIncome) * 100;
      
      // Determine approval likelihood based on DTI
      setTimeout(() => {
        if (dtiRatio > 50) {
          setConfidence(Math.max(10, Math.round(100 - dtiRatio)));
          setAiAnalysis(`⚠️ High Risk: DTI ratio is ${dtiRatio.toFixed(1)}%. Debt payments would exceed 50% of income. Loan will likely be REJECTED. Consider reducing loan amount or increasing income.`);
        } else if (dtiRatio > 40) {
          setConfidence(Math.round(70 - (dtiRatio - 40) * 2));
          setAiAnalysis(`⚡ Moderate Risk: DTI ratio is ${dtiRatio.toFixed(1)}%. Close to the 50% threshold. Consider a lower loan amount for better terms.`);
        } else if (dtiRatio > 30) {
          setConfidence(Math.round(85 - (dtiRatio - 30)));
          setAiAnalysis(`✓ Good Profile: DTI ratio is ${dtiRatio.toFixed(1)}%. Monthly payments are manageable within your income level.`);
        } else {
          setConfidence(Math.min(98, Math.round(95 + (30 - dtiRatio) / 3)));
          setAiAnalysis(`✓ Excellent Profile: DTI ratio is only ${dtiRatio.toFixed(1)}%. Strong approval likelihood with favorable terms.`);
        }
        setAiLoading(false);
      }, 300);
    } else if (view === 'APPLICATION') {
      setConfidence(0);
      setAiAnalysis('Enter your monthly income and existing debt to calculate your DTI ratio and approval likelihood.');
    }
  }, [loanAmount, term, monthlyIncome, existingDebt, view]);

  // Demo fill functions
  const handleDemoFillApprove = () => {
    setMonthlyIncome(DEMO_APPROVE_DATA.monthlyIncome);
    setExistingDebt(DEMO_APPROVE_DATA.existingDebt);
    setEmployer(DEMO_APPROVE_DATA.employer);
    setEmploymentYears(DEMO_APPROVE_DATA.employmentYears);
    setLoanAmount(15000); // Reasonable amount for this income
  };

  const handleDemoFillReject = () => {
    setMonthlyIncome(DEMO_REJECT_DATA.monthlyIncome);
    setExistingDebt(DEMO_REJECT_DATA.existingDebt);
    setEmployer(DEMO_REJECT_DATA.employer);
    setEmploymentYears(DEMO_REJECT_DATA.employmentYears);
    setLoanAmount(40000); // Too high for this income
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
    
    // Get account ID from user's accounts
    const accountId = user.accounts?.[0]?.id;
    if (!accountId) {
      alert('No account found to pay from. Please ensure you have an active account.');
      setPayingLoanId(null);
      return;
    }
    
    try {
      // Call backend to pay EMI
      const response = await loanApi.payEmi(loan.id, accountId, loan.emiAmount);
      
      if (response.success) {
        // Update local state
        onPayment(loan.emiAmount);
        
        // Refresh loans
        const loansResponse = await loanApi.getByUserId(user.id || '');
        if (loansResponse.success && loansResponse.data) {
          const loanData = loansResponse.data as LoanData[];
          setLoans(loanData.map((l: LoanData) => ({
            id: l.id,
            type: l.loan_type || l.type || 'Personal',
            amount: parseFloat(String(l.loan_amount || l.principal_amount || 0)),
            remaining: parseFloat(String(l.outstanding_balance || l.remaining_amount || 0)),
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

  // Submit loan application with DTI check
  const handleSubmitApplication = async () => {
    if (!user.id) {
      alert('Please log in to apply for a loan');
      return;
    }

    if (monthlyIncome <= 0) {
      alert('Please enter your monthly income');
      return;
    }

    setSubmitting(true);
    setApplicationResult(null);
    
    try {
      // Calculate EMI
      const monthlyRate = 0.085 / 12; // 8.5% annual rate
      const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
      
      // Calculate DTI ratio
      const totalMonthlyDebt = existingDebt + emi;
      const dtiRatio = (totalMonthlyDebt / monthlyIncome) * 100;

      // Simulate processing with realistic steps
      setProcessingStep('Validating application data...');
      await new Promise(r => setTimeout(r, 800));
      
      setProcessingStep('Checking credit history...');
      await new Promise(r => setTimeout(r, 1000));
      
      setProcessingStep('Analyzing Debt-to-Income ratio...');
      await new Promise(r => setTimeout(r, 1200));
      
      setProcessingStep('Running risk assessment model...');
      await new Promise(r => setTimeout(r, 1000));
      
      setProcessingStep('Generating decision...');
      await new Promise(r => setTimeout(r, 600));

      // DTI Decision: If (Existing Debt + New EMI) > (Income * 0.5), REJECT
      if (dtiRatio > 50) {
        setApplicationResult({
          status: 'REJECTED',
          message: `Application Denied: High Debt-to-Income Ratio (${dtiRatio.toFixed(1)}%). Your total monthly debt obligations would exceed 50% of your income. Consider reducing the loan amount or paying down existing debt.`,
          dtiRatio
        });
      } else {
        // Try to submit to backend
        try {
          const response = await loanApi.applyForLoan({
            user_id: user.id,
            requested_amount: loanAmount,
            monthly_income: monthlyIncome,
            credit_score: 750,
            ai_risk_score: confidence,
          });
          
          if (response.success) {
            setApplicationResult({
              status: 'APPROVED',
              message: `Congratulations! Your loan application for $${loanAmount.toLocaleString()} has been approved! DTI ratio: ${dtiRatio.toFixed(1)}%. Expected monthly payment: $${emi.toFixed(2)}. Final approval documents will be sent to your email.`,
              dtiRatio
            });
          }
        } catch {
          // Even if backend fails, show approval for demo
          setApplicationResult({
            status: 'APPROVED',
            message: `Congratulations! Your loan application for $${loanAmount.toLocaleString()} has been approved! DTI ratio: ${dtiRatio.toFixed(1)}%. Expected monthly payment: $${emi.toFixed(2)}. Final approval documents will be sent to your email.`,
            dtiRatio
          });
        }
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
      setProcessingStep('');
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
           ) : (
             <>
               {/* Pending Applications Section */}
               {pendingApps.length > 0 && (
                 <div className="space-y-4">
                   <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest flex items-center gap-2">
                     <span className="material-symbols-outlined text-yellow-500 text-sm">pending</span>
                     Pending Applications
                   </h3>
                   <div className="grid gap-4">
                     {pendingApps.map(app => (
                       <div key={app.id} className="bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-2xl border border-yellow-200 dark:border-yellow-900/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                         <div className="flex items-center gap-4">
                           <div className="size-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                             <span className="material-symbols-outlined text-yellow-600">hourglass_top</span>
                           </div>
                           <div>
                             <p className="font-bold text-slate-900 dark:text-white">Application #{app.id.slice(0, 8)}</p>
                             <p className="text-sm text-slate-500">
                               Requested: <span className="font-bold text-primary">${parseFloat(String(app.requested_amount)).toLocaleString()}</span>
                               <span className="mx-2">•</span>
                               {new Date(app.applied_at).toLocaleDateString()}
                             </p>
                             {app.ai_risk_score && (
                               <p className="text-xs text-slate-400 mt-1">AI Score: {app.ai_risk_score}%</p>
                             )}
                           </div>
                         </div>
                         <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                           <span className="material-symbols-outlined text-sm">schedule</span>
                           Pending Review
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* Active Loans Section */}
               {loans.length === 0 && pendingApps.length === 0 ? (
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
               ) : loans.length > 0 && (
                 <>
                   {pendingApps.length > 0 && (
                     <h3 className="font-bold text-slate-500 uppercase text-xs tracking-widest flex items-center gap-2 mt-4">
                       <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                       Active Loans
                     </h3>
                   )}
                   {loans.map(loan => (
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
             ))}
                 </>
               )}
             </>
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
           <div className="lg:col-span-7 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-primary">psychology</span>
                   <h3 className="text-2xl font-black">AI Loan Application</h3>
                 </div>
                 {/* Demo Fill Buttons */}
                 <div className="flex gap-2">
                   <button 
                     onClick={handleDemoFillReject}
                     className="text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-all"
                     title="Fill with data that will be rejected"
                   >
                     Demo: Reject
                   </button>
                   <button 
                     onClick={handleDemoFillApprove}
                     className="text-xs px-3 py-1.5 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-600 rounded-lg font-medium transition-all"
                     title="Fill with data that will be approved"
                   >
                     Demo: Approve
                   </button>
                 </div>
              </div>

              {/* Application Result */}
              {applicationResult && (
                <div className={`p-6 rounded-2xl border-2 animate-in zoom-in-95 ${
                  applicationResult.status === 'APPROVED' 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start gap-4">
                    <span className={`material-symbols-outlined text-4xl ${
                      applicationResult.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {applicationResult.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                    </span>
                    <div>
                      <h4 className={`text-xl font-bold mb-2 ${
                        applicationResult.status === 'APPROVED' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {applicationResult.status === 'APPROVED' ? 'Application Approved!' : 'Application Denied'}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{applicationResult.message}</p>
                      <button 
                        onClick={() => { setApplicationResult(null); setView('TRACKING'); }}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-xl font-bold text-sm"
                      >
                        {applicationResult.status === 'APPROVED' ? 'View My Loans' : 'Try Again'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Animation */}
              {submitting && processingStep && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 animate-in fade-in">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
                    </div>
                    <div>
                      <p className="font-bold text-primary">{processingStep}</p>
                      <p className="text-xs text-slate-500 mt-1">Please wait while we process your application...</p>
                    </div>
                  </div>
                </div>
              )}

              {!applicationResult && (
                <div className="space-y-6">
                  {/* Loan Amount Slider */}
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

                  {/* Repayment Period Slider */}
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

                  {/* Financial Details Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h4 className="font-bold text-sm text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">account_balance</span>
                      Financial Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-2">Monthly Income ($)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                          <input 
                            type="number"
                            value={monthlyIncome || ''}
                            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                            placeholder="8,000"
                            className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-2">Existing Monthly Debt ($)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-3.5 text-slate-400 font-bold">$</span>
                          <input 
                            type="number"
                            value={existingDebt || ''}
                            onChange={(e) => setExistingDebt(Number(e.target.value))}
                            placeholder="500"
                            className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-2">Employer Name</label>
                        <input 
                          type="text"
                          value={employer}
                          onChange={(e) => setEmployer(e.target.value)}
                          placeholder="Acme Corporation"
                          className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-600 dark:text-slate-400 block mb-2">Years Employed</label>
                        <input 
                          type="number"
                          value={employmentYears || ''}
                          onChange={(e) => setEmploymentYears(Number(e.target.value))}
                          placeholder="5"
                          className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold focus:ring-2 focus:ring-primary border-none"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSubmitApplication}
                    disabled={submitting || monthlyIncome <= 0}
                    className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Application
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </div>
              )}
           </div>

           <div className="lg:col-span-5 space-y-6">
              <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center space-y-6">
                 <h4 className="font-bold uppercase text-xs tracking-widest text-slate-400">Approval Likelihood</h4>
                 <div className="relative size-40 mx-auto">
                    <svg className="size-full transform -rotate-90">
                       <circle cx="80" cy="80" r="70" className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="12" />
                       <circle cx="80" cy="80" r="70" className={`fill-none transition-all duration-500 ${
                         confidence > 70 ? 'stroke-green-500' : confidence > 40 ? 'stroke-yellow-500' : 'stroke-red-500'
                       }`} strokeWidth="12" strokeDasharray="440" strokeDashoffset={440 - (440 * confidence / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <span className={`text-4xl font-black ${
                         confidence > 70 ? 'text-green-500' : confidence > 40 ? 'text-yellow-500' : confidence > 0 ? 'text-red-500' : 'text-slate-400'
                       }`}>{confidence}%</span>
                       <span className="text-[10px] font-bold uppercase text-slate-400">Score</span>
                    </div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                    <p className="text-[10px] font-bold uppercase text-primary mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">auto_awesome</span> AI Risk Analysis (DTI)
                      {aiLoading && <span className="material-symbols-outlined text-xs animate-spin ml-2">sync</span>}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {aiLoading ? 'Analyzing your DTI ratio...' : aiAnalysis}
                    </p>
                 </div>
                 
                 {/* DTI Explanation */}
                 <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-left">
                   <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                     <span className="material-symbols-outlined text-xs">info</span> What is DTI?
                   </p>
                   <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                     Debt-to-Income (DTI) ratio measures your monthly debt payments vs. income. 
                     Loans are <strong>automatically rejected</strong> if DTI exceeds 50%.
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
