
import React, { useState, useEffect } from 'react';
import { UserState, Transaction } from '../types';
import { accountApi, withdrawalApi } from '../src/services/api';

interface ManageFundsProps {
  user: UserState;
  onUpdate: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

const ManageFunds: React.FC<ManageFundsProps> = ({ user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [atmCode, setAtmCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Timer countdown for ATM code
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && atmCode) {
      // Code expired
      setAtmCode('');
      setError('ATM code has expired. Please generate a new one.');
    }
  }, [timer, atmCode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const accountId = user.accounts[0]?.id;
      if (!accountId) {
        setError('No account found');
        return;
      }

      const response = await accountApi.deposit(accountId, parseFloat(amount), 'Manual Deposit');
      
      if (response.success) {
        setSuccess(`Successfully deposited $${parseFloat(amount).toLocaleString()}`);
        onUpdate({ type: 'DEPOSIT', amount: parseFloat(amount), description: 'Manual Deposit' });
        setAmount('');
      } else {
        setError(response.error || 'Deposit failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAtmCode = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    if (parseFloat(amount) > user.balance) {
      setError('Insufficient balance for this withdrawal');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const accountId = user.accounts[0]?.id;
      if (!accountId) {
        setError('No account found');
        return;
      }

      const response = await withdrawalApi.generateAtmCode(accountId, parseFloat(amount));
      
      if (response.success && response.data) {
        const data = response.data as any;
        setAtmCode(data.code || data.atm_code);
        setTimer(900); // 15 minutes
        setSuccess('ATM code generated successfully!');
      } else {
        setError(response.error || 'Failed to generate ATM code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate ATM code');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    if (activeTab === 'DEPOSIT') {
      handleDeposit();
    } else {
      handleGenerateAtmCode();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Manage Funds</h2>
          <p className="text-slate-500">Securely move money in and out of your account.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 bg-surface-light dark:bg-surface-dark p-1 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl m-4">
            <button 
              onClick={() => {setActiveTab('DEPOSIT'); setAtmCode(''); setTimer(0); setError(null); setSuccess(null);}}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'DEPOSIT' ? 'bg-white dark:bg-slate-800 text-success shadow-md' : 'text-slate-500'}`}
            >
              <span className="material-symbols-outlined">arrow_downward</span> Deposit
            </button>
            <button 
              onClick={() => {setActiveTab('WITHDRAWAL'); setError(null); setSuccess(null);}}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'WITHDRAWAL' ? 'bg-white dark:bg-slate-800 text-warning shadow-md' : 'text-slate-500'}`}
            >
              <span className="material-symbols-outlined">arrow_upward</span> Withdraw
            </button>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-4">
               <label className="block space-y-2">
                 <span className="text-sm font-bold">{activeTab === 'DEPOSIT' ? 'Amount to Add' : 'Withdrawal Amount'}</span>
                 <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      className="w-full h-20 pl-12 pr-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-4xl font-black placeholder:text-slate-300 transition-all" 
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      disabled={loading || (activeTab === 'WITHDRAWAL' && atmCode !== '')}
                    />
                 </div>
               </label>

               <div className="flex gap-2">
                 {[100, 500, 1000, 5000].map(val => (
                   <button 
                    key={val} 
                    onClick={() => setAmount(val.toString())}
                    disabled={loading || (activeTab === 'WITHDRAWAL' && atmCode !== '')}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
                   >
                     +${val}
                   </button>
                 ))}
               </div>
            </div>

            {activeTab === 'DEPOSIT' ? (
              <div className="space-y-6 animate-slide-in-right">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                   <div className="size-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                     <span className="material-symbols-outlined text-primary">credit_card</span>
                   </div>
                   <div className="flex-1">
                     <p className="font-bold text-sm">HDFC Bank Debit Card</p>
                     <p className="text-xs text-slate-500">Ending in •••• 4402</p>
                   </div>
                   <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </div>
                <button 
                  onClick={handleAction}
                  disabled={!amount || loading || parseFloat(amount) <= 0}
                  className="w-full h-14 bg-success hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-success/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Processing...
                    </>
                  ) : (
                    'Add Funds'
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in-right">
                {!atmCode ? (
                  <button 
                    onClick={handleAction}
                    disabled={!amount || loading || parseFloat(amount) <= 0 || parseFloat(amount) > user.balance}
                    className="w-full h-14 bg-warning hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-warning/20 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Generating...
                      </>
                    ) : (
                      'Generate ATM Code'
                    )}
                  </button>
                ) : (
                  <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4 animate-slide-up">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Cardless ATM Code</p>
                    <div className="text-5xl font-mono font-black tracking-[0.5em] text-primary">{atmCode}</div>
                    <div className="flex items-center justify-center gap-2 text-warning text-sm font-bold">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      Expires in {formatTime(timer)}
                    </div>
                    <p className="text-sm text-slate-500">Withdrawal Amount: <span className="font-bold text-primary">${parseFloat(amount).toLocaleString()}</span></p>
                    <button 
                      onClick={() => { setAtmCode(''); setTimer(0); setAmount(''); }}
                      className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                    >
                      Generate New Code
                    </button>
                  </div>
                )}
                <p className="text-center text-xs text-slate-500">Withdraw cash at any Aura Bank ATM using this code. No card needed.</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4 space-y-6">
          <div className="bg-primary p-6 rounded-3xl text-white shadow-lg shadow-primary/20">
             <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-1">Current Balance</p>
             <h3 className="text-3xl font-black">${user.balance.toLocaleString()}</h3>
             <div className="mt-6 flex justify-between gap-4">
                <div className="flex-1 bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] font-bold uppercase">Available</p>
                  <p className="text-sm font-bold">${user.balance.toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] font-bold uppercase">Pending</p>
                  <p className="text-sm font-bold">$0</p>
                </div>
             </div>
          </div>

          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <h4 className="font-bold mb-4">ATM Locations</h4>
             <div className="space-y-4">
                {[
                  { name: 'Financial Dist. Br.', dist: '0.4 mi' },
                  { name: 'Westfield Mall ATM', dist: '1.2 mi' },
                  { name: 'Union Square Hub', dist: '2.5 mi' }
                ].map((loc, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{loc.name}</span>
                    <span className="font-bold">{loc.dist}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageFunds;
