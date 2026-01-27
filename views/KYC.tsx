
import React, { useState } from 'react';
import { userApi } from '../src/services/api';

interface KYCProps {
  userId?: string;
  onComplete: (data: { accountNumber: string; account?: any }) => void;
}

// Type for KYC completion response
interface KycResponse {
  user: any;
  account: {
    id: string;
    account_number: string;
    balance: number;
  };
}

const KYC: React.FC<KYCProps> = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    address: '',
    phone: '',
    accountType: 'SAVINGS',
    pin: ['', '', '', '']
  });
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<{ account_number: string } | null>(null);

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    try {
      if (userId) {
        // Call backend to complete KYC and create account
        const response = await userApi.completeKyc(userId, {
          address: formData.address,
          phone_number: formData.phone,
        });

        if (response.success && response.data) {
          const data = response.data as KycResponse;
          setCreatedAccount({ account_number: data.account.account_number });
          setIsSuccess(true);
        } else {
          setError(response.error || 'Failed to complete KYC');
        }
      } else {
        // Fallback for demo mode without userId
        const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        setCreatedAccount({ account_number: accountNumber });
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('KYC error:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete KYC');
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newPin = [...formData.pin];
      newPin[index] = value;
      setFormData({ ...formData, pin: newPin });
      
      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`pin-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  if (isSuccess && createdAccount) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 dark:border-slate-700 animate-in zoom-in-95">
          <div className="h-24 bg-gradient-to-r from-blue-500 to-primary w-full"></div>
          <div className="relative pt-12 px-8 pb-8 flex flex-col items-center text-center">
            <div className="size-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg absolute -top-10 ring-4 ring-slate-50 dark:ring-slate-950">
               <span className="material-symbols-outlined text-success text-5xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Welcome to Aura Bank. Your account is verified and ready.</p>
            <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-8">
              <p className="text-xs uppercase font-bold text-slate-400 mb-1">Account Number</p>
              <p className="text-2xl font-mono font-bold tracking-widest text-primary">{createdAccount.account_number}</p>
            </div>
            <button 
              onClick={() => onComplete({ accountNumber: createdAccount.account_number })}
              className="w-full h-12 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Go to Dashboard <span className="material-symbols-outlined">dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 text-center">
          <h1 className="text-3xl font-black mb-2">Open Your Account</h1>
          <p className="text-slate-500 dark:text-slate-400">Step {step} of 3</p>
        </div>

        {error && (
          <div className="mx-8 mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">person</span> Personal Details</h2>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Full Legal Name</span>
                  <input 
                    type="text" 
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary" 
                    placeholder="e.g. Alex Morgan"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Identity Number (SSN/ID)</span>
                  <input 
                    type="text" 
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary" 
                    placeholder="XXXX-XXXX-XXXX"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Phone Number</span>
                  <input 
                    type="tel" 
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary" 
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Address</span>
                  <input 
                    type="text" 
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary" 
                    placeholder="123 Main St, City, State, ZIP"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </label>
              </div>
              <button onClick={() => setStep(2)} className="w-full h-12 bg-primary text-white font-bold rounded-xl mt-4">Continue</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">account_balance_wallet</span> Select Account Type</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                  onClick={() => setFormData({...formData, accountType: 'SAVINGS'})}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.accountType === 'SAVINGS' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary/50'}`}
                 >
                   <span className="material-symbols-outlined text-primary text-3xl mb-4">savings</span>
                   <h3 className="font-bold">Savings Account</h3>
                   <p className="text-xs text-slate-500 mt-1">4.5% Interest, No Min. Balance</p>
                 </button>
                 <button 
                  onClick={() => setFormData({...formData, accountType: 'CURRENT'})}
                  className={`p-6 rounded-2xl border-2 text-left transition-all ${formData.accountType === 'CURRENT' ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800 hover:border-primary/50'}`}
                 >
                   <span className="material-symbols-outlined text-primary text-3xl mb-4">payments</span>
                   <h3 className="font-bold">Current Account</h3>
                   <p className="text-xs text-slate-500 mt-1">High limits for business use</p>
                 </button>
               </div>
               <div className="flex gap-4">
                 <button onClick={() => setStep(1)} className="flex-1 h-12 border border-slate-200 dark:border-slate-800 font-bold rounded-xl">Back</button>
                 <button onClick={() => setStep(3)} className="flex-[2] h-12 bg-primary text-white font-bold rounded-xl">Continue</button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">security</span> Setup Security PIN</h2>
               <p className="text-sm text-slate-500">Create a 4-digit PIN for sensitive transactions.</p>
               <div className="flex justify-center gap-4">
                 {[0,1,2,3].map(i => (
                   <input 
                     key={i} 
                     id={`pin-${i}`}
                     type="password" 
                     maxLength={1} 
                     value={formData.pin[i]}
                     onChange={(e) => handlePinChange(i, e.target.value)}
                     className="size-14 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-800 rounded-xl border-none focus:ring-2 focus:ring-primary" 
                   />
                 ))}
               </div>
               <div className="flex gap-4">
                 <button onClick={() => setStep(2)} className="flex-1 h-12 border border-slate-200 dark:border-slate-800 font-bold rounded-xl">Back</button>
                 <button 
                   onClick={handleFinish} 
                   disabled={loading}
                   className="flex-[2] h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2"
                 >
                   {loading ? (
                     <span className="material-symbols-outlined animate-spin">refresh</span>
                   ) : (
                     'Finish Setup'
                   )}
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYC;
