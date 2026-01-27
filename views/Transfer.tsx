
import React, { useState } from 'react';
import { UserState, Transaction } from '../types';

interface TransferProps {
  user: UserState;
  onTransfer: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

const Transfer: React.FC<TransferProps> = ({ user, onTransfer }) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState(1);

  const handleTransfer = () => {
    onTransfer({
      type: 'TRANSFER',
      amount: parseFloat(amount),
      description: `To ${recipient}`
    });
    setStep(3); // Success
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      <div className="flex items-center gap-4">
        <div className="size-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
          <span className="material-symbols-outlined">sync_alt</span>
        </div>
        <div>
          <h2 className="text-3xl font-black">Transfer Money</h2>
          <p className="text-slate-500">Move funds instantly to any account.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
          {step === 1 && (
            <div className="space-y-6 animate-slide-in-right">
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Recipient Account Number</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">person</span>
                    <input 
                      type="text" 
                      className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary transition-all" 
                      placeholder="0000 0000 0000"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                    />
                  </div>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Amount to Transfer</span>
                  <div className="relative">
                    <span className="absolute left-4 top-3 font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-xl font-bold transition-all" 
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              <button 
                onClick={() => setStep(2)}
                disabled={!amount || !recipient}
                className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-slide-in-right">
               <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                 <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">You are sending</p>
                 <h3 className="text-4xl font-black text-primary">${parseFloat(amount).toLocaleString()}</h3>
                 <p className="text-sm text-slate-500 mt-2">to <span className="font-bold text-slate-900 dark:text-white">{recipient}</span></p>
               </div>
               
               <div className="space-y-4">
                 <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest">Enter Security PIN</p>
                 <div className="flex justify-center gap-4">
                   {pin.map((digit, i) => (
                     <input 
                        key={i} 
                        type="password" 
                        maxLength={1}
                        className="size-14 text-center text-2xl font-bold bg-slate-100 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all"
                        onChange={(e) => {
                          const newPin = [...pin];
                          newPin[i] = e.target.value;
                          setPin(newPin);
                        }}
                      />
                   ))}
                 </div>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => setStep(1)} className="flex-1 h-14 border border-slate-200 dark:border-slate-800 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">Cancel</button>
                  <button onClick={handleTransfer} className="flex-[2] h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">Confirm & Transfer</button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-slide-up">
               <div className="size-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                 <span className="material-symbols-outlined text-5xl">check_circle</span>
               </div>
               <h3 className="text-2xl font-bold">Transfer Successful!</h3>
               <p className="text-slate-500">Your funds have been dispatched to the recipient. Reference ID: <span className="font-mono text-primary">AURA-{Math.floor(Math.random()*1000000)}</span></p>
               <button onClick={() => {setStep(1); setAmount(''); setRecipient('');}} className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">New Transfer</button>
            </div>
          )}
        </div>

        <div className="md:col-span-4 space-y-6">
           <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-4">Quick Transfer</h3>
             <div className="space-y-4">
               {[
                 { name: 'John Cooper', avatar: 'https://picsum.photos/seed/john/40' },
                 { name: 'Creative Studio', avatar: 'https://picsum.photos/seed/studio/40' },
                 { name: 'Maria Lopez', avatar: 'https://picsum.photos/seed/maria/40' }
               ].map((p, i) => (
                 <button key={i} onClick={() => setRecipient(p.name)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                   <img src={p.avatar} className="size-10 rounded-full" alt="" />
                   <span className="font-bold text-sm">{p.name}</span>
                 </button>
               ))}
               <button className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all active:scale-95">
                 + Add Beneficiary
               </button>
             </div>
           </div>

           <div className="bg-blue-600 p-6 rounded-3xl text-white">
             <span className="material-symbols-outlined mb-2">verified_user</span>
             <h4 className="font-bold mb-1">Encrypted Transfers</h4>
             <p className="text-xs text-blue-100">All transactions use 256-bit SSL encryption and blockchain verification for maximum safety.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
