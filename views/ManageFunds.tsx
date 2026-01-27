
import React, { useState } from 'react';
import { UserState, Transaction } from '../types';

interface ManageFundsProps {
  user: UserState;
  onUpdate: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

const ManageFunds: React.FC<ManageFundsProps> = ({ user, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [atmCode, setAtmCode] = useState('');
  const [timer, setTimer] = useState(0);

  const handleAction = () => {
    if (activeTab === 'DEPOSIT') {
      onUpdate({ type: 'DEPOSIT', amount: parseFloat(amount), description: 'Manual Deposit' });
      setAmount('');
    } else {
      setAtmCode(Math.floor(100000 + Math.random() * 900000).toString());
      setTimer(900); // 15 mins
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 bg-surface-light dark:bg-surface-dark p-1 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl m-4">
            <button 
              onClick={() => {setActiveTab('DEPOSIT'); setAtmCode('');}}
              className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'DEPOSIT' ? 'bg-white dark:bg-slate-800 text-success shadow-md' : 'text-slate-500'}`}
            >
              <span className="material-symbols-outlined">arrow_downward</span> Deposit
            </button>
            <button 
              onClick={() => setActiveTab('WITHDRAWAL')}
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
                    />
                 </div>
               </label>

               <div className="flex gap-2">
                 {[100, 500, 1000, 5000].map(val => (
                   <button 
                    key={val} 
                    onClick={() => setAmount(val.toString())}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95"
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
                  disabled={!amount}
                  className="w-full h-14 bg-success hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-success/20 disabled:opacity-50 transition-all active:scale-95"
                >
                  Add Funds
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in-right">
                {!atmCode ? (
                  <button 
                    onClick={handleAction}
                    disabled={!amount}
                    className="w-full h-14 bg-warning hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-warning/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    Generate ATM Code
                  </button>
                ) : (
                  <div className="p-8 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4 animate-slide-up">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your Cardless ATM Code</p>
                    <div className="text-5xl font-mono font-black tracking-[0.5em] text-primary">{atmCode}</div>
                    <div className="flex items-center justify-center gap-2 text-warning text-sm font-bold">
                      <span className="material-symbols-outlined text-sm">timer</span>
                      Expires in 14:59
                    </div>
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
                  <p className="text-[10px] font-bold uppercase">Today</p>
                  <p className="text-sm font-bold">+$12.5k</p>
                </div>
                <div className="flex-1 bg-white/10 p-3 rounded-xl">
                  <p className="text-[10px] font-bold uppercase">Used</p>
                  <p className="text-sm font-bold">-$4.8k</p>
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
