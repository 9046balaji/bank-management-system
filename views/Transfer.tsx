
import React, { useState, useEffect } from 'react';
import { UserState, Transaction } from '../types';
import { transactionApi, accountApi } from '../src/services/api';

interface TransferProps {
  user: UserState;
  onTransfer: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
}

interface Beneficiary {
  name: string;
  accountNumber: string;
  avatar?: string;
}

const Transfer: React.FC<TransferProps> = ({ user, onTransfer }) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState('');
  const [beneficiaries] = useState<Beneficiary[]>([
    { name: 'John Cooper', accountNumber: '1234567890', avatar: 'https://picsum.photos/seed/john/40' },
    { name: 'Creative Studio', accountNumber: '0987654321', avatar: 'https://picsum.photos/seed/studio/40' },
    { name: 'Maria Lopez', accountNumber: '5678901234', avatar: 'https://picsum.photos/seed/maria/40' }
  ]);

  // Validate recipient account when moving to step 2
  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      // Try to validate the recipient account exists
      const response = await accountApi.getByAccountNumber(recipient);
      if (response.success && response.data) {
        setRecipientName((response.data as any).account_holder_name || recipient);
        setStep(2);
      } else {
        // If we can't validate, proceed anyway (allow external transfers)
        setRecipientName(recipient);
        setStep(2);
      }
    } catch (err) {
      // Proceed even if validation fails (external transfers)
      setRecipientName(recipient);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    setError(null);
    setLoading(true);

    const pinCode = pin.join('');
    if (pinCode.length !== 4) {
      setError('Please enter your 4-digit PIN');
      setLoading(false);
      return;
    }

    try {
      // Call the actual API
      const response = await transactionApi.transfer({
        from_account_id: user.accounts[0]?.id || '',
        to_account_number: recipient,
        amount: parseFloat(amount),
        description: `Transfer to ${recipientName}`,
        pin: pinCode,
      });

      if (response.success) {
        // Generate reference ID from response or create one
        setReferenceId((response.data as any)?.reference_id || `AURA-${Date.now().toString(36).toUpperCase()}`);
        
        // Call the parent callback to update local state
        onTransfer({
          type: 'TRANSFER',
          amount: parseFloat(amount),
          description: `To ${recipientName}`
        });
        
        setStep(3); // Success
      } else {
        setError(response.error || 'Transfer failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBeneficiary = (beneficiary: Beneficiary) => {
    setRecipient(beneficiary.accountNumber);
    setRecipientName(beneficiary.name);
  };

  const resetForm = () => {
    setStep(1);
    setAmount('');
    setRecipient('');
    setRecipientName('');
    setPin(['', '', '', '']);
    setError(null);
    setReferenceId('');
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

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

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
                  {user.accounts[0] && (
                    <p className="text-sm text-slate-500">Available balance: <span className="font-bold text-primary">${user.accounts[0].balance.toLocaleString()}</span></p>
                  )}
                </label>
              </div>
              <button 
                onClick={handleContinue}
                disabled={!amount || !recipient || loading || parseFloat(amount) <= 0}
                className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Validating...
                  </>
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-slide-in-right">
               <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                 <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">You are sending</p>
                 <h3 className="text-4xl font-black text-primary">${parseFloat(amount).toLocaleString()}</h3>
                 <p className="text-sm text-slate-500 mt-2">to <span className="font-bold text-slate-900 dark:text-white">{recipientName}</span></p>
                 <p className="text-xs text-slate-400 mt-1">Account: {recipient}</p>
               </div>
               
               <div className="space-y-4">
                 <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest">Enter Security PIN</p>
                 <div className="flex justify-center gap-4">
                   {pin.map((digit, i) => (
                     <input 
                        key={i} 
                        type="password" 
                        maxLength={1}
                        value={digit}
                        className="size-14 text-center text-2xl font-bold bg-slate-100 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary transition-all"
                        onChange={(e) => {
                          const newPin = [...pin];
                          newPin[i] = e.target.value;
                          setPin(newPin);
                          // Auto-focus next input
                          if (e.target.value && i < 3) {
                            const nextInput = e.target.parentElement?.children[i + 1] as HTMLInputElement;
                            nextInput?.focus();
                          }
                        }}
                      />
                   ))}
                 </div>
               </div>

               <div className="flex gap-4">
                  <button 
                    onClick={() => { setStep(1); setError(null); }} 
                    disabled={loading}
                    className="flex-1 h-14 border border-slate-200 dark:border-slate-800 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleTransfer} 
                    disabled={loading || pin.some(d => !d)}
                    className="flex-[2] h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Processing...
                      </>
                    ) : (
                      'Confirm & Transfer'
                    )}
                  </button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 animate-slide-up">
               <div className="size-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                 <span className="material-symbols-outlined text-5xl">check_circle</span>
               </div>
               <h3 className="text-2xl font-bold">Transfer Successful!</h3>
               <p className="text-slate-500">Your funds have been dispatched to the recipient. Reference ID: <span className="font-mono text-primary">{referenceId}</span></p>
               <button onClick={resetForm} className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">New Transfer</button>
            </div>
          )}
        </div>

        <div className="md:col-span-4 space-y-6">
           <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <h3 className="font-bold mb-4">Quick Transfer</h3>
             <div className="space-y-4">
               {beneficiaries.map((p, i) => (
                 <button key={i} onClick={() => handleSelectBeneficiary(p)} className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95">
                   <img src={p.avatar} className="size-10 rounded-full" alt="" />
                   <div className="text-left">
                     <span className="font-bold text-sm block">{p.name}</span>
                     <span className="text-xs text-slate-400">{p.accountNumber}</span>
                   </div>
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
