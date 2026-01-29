
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
  bank?: string;
}

interface VerifiedRecipient {
  name: string;
  accountNumber: string;
  bank: string;
  isVerified: boolean;
  avatar?: string;
}

const Transfer: React.FC<TransferProps> = ({ user, onTransfer }) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState(1); // 1: Bank Selection, 2: Enter Details, 3: Review, 4: PIN, 5: Success
  const [bankType, setBankType] = useState<'AURA' | 'OTHER' | null>(null);
  const [otherBankName, setOtherBankName] = useState('');
  const [otherBankIFSC, setOtherBankIFSC] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<VerifiedRecipient | null>(null);
  const [beneficiaries] = useState<Beneficiary[]>([
    // Aura Bank beneficiaries
    { name: 'John Cooper', accountNumber: '1234567890', avatar: 'https://picsum.photos/seed/john/40', bank: 'Aura Bank' },
    { name: 'Creative Studio', accountNumber: '0987654321', avatar: 'https://picsum.photos/seed/studio/40', bank: 'Aura Bank' },
    { name: 'Sarah Johnson', accountNumber: '5432167890', avatar: 'https://picsum.photos/seed/sarah/40', bank: 'Aura Bank' },
    // External Bank beneficiaries (15 non-Aura bankers for IMPS/NEFT transfers)
    { name: 'Maria Lopez', accountNumber: '5678901234', avatar: 'https://picsum.photos/seed/maria/40', bank: 'HDFC Bank' },
    { name: 'Rahul Sharma', accountNumber: '9876543210', avatar: 'https://picsum.photos/seed/rahul/40', bank: 'ICICI Bank' },
    { name: 'Priya Patel', accountNumber: '1122334455', avatar: 'https://picsum.photos/seed/priya/40', bank: 'State Bank of India' },
    { name: 'Amit Kumar', accountNumber: '6677889900', avatar: 'https://picsum.photos/seed/amit/40', bank: 'Axis Bank' },
    { name: 'Sneha Gupta', accountNumber: '2233445566', avatar: 'https://picsum.photos/seed/sneha/40', bank: 'Kotak Bank' },
    { name: 'Vikram Singh', accountNumber: '7788990011', avatar: 'https://picsum.photos/seed/vikram/40', bank: 'Yes Bank' },
    { name: 'Anjali Desai', accountNumber: '3344556677', avatar: 'https://picsum.photos/seed/anjali/40', bank: 'Punjab National Bank' },
    { name: 'Arjun Reddy', accountNumber: '8899001122', avatar: 'https://picsum.photos/seed/arjun/40', bank: 'Bank of Baroda' },
    { name: 'Kavitha Menon', accountNumber: '4455667788', avatar: 'https://picsum.photos/seed/kavitha/40', bank: 'Indian Bank' },
    { name: 'Suresh Iyer', accountNumber: '9900112233', avatar: 'https://picsum.photos/seed/suresh/40', bank: 'HDFC Bank' },
    { name: 'Ritu Malhotra', accountNumber: '5566778899', avatar: 'https://picsum.photos/seed/ritu/40', bank: 'ICICI Bank' },
    { name: 'Deepak Nair', accountNumber: '1234098765', avatar: 'https://picsum.photos/seed/deepak/40', bank: 'State Bank of India' },
    { name: 'Meera Krishnan', accountNumber: '6543210987', avatar: 'https://picsum.photos/seed/meera/40', bank: 'Axis Bank' },
    { name: 'Rajesh Verma', accountNumber: '7890123456', avatar: 'https://picsum.photos/seed/rajesh/40', bank: 'Kotak Bank' },
    { name: 'Ananya Rao', accountNumber: '3210987654', avatar: 'https://picsum.photos/seed/ananya/40', bank: 'Yes Bank' }
  ]);

  // Get the primary account - prefer from accounts array, fallback to user balance
  const primaryAccount = user.accounts?.[0];
  const accountId = primaryAccount?.id || '';
  const accountBalance = primaryAccount?.balance ?? user.balance ?? 0;

  // Verify recipient account number
  const handleVerifyAccount = async () => {
    setError(null);
    setVerifying(true);
    setVerifiedRecipient(null);

    try {
      if (bankType === 'AURA') {
        // Verify within Aura Bank
        const response = await accountApi.getByAccountNumber(recipient);
        if (response.success && response.data) {
          const data = response.data as any;
          setVerifiedRecipient({
            name: data.account_holder_name || data.full_name || 'Account Holder',
            accountNumber: recipient,
            bank: 'Aura Bank',
            isVerified: true,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.account_holder_name || 'User')}&background=135bec&color=fff`
          });
          setRecipientName(data.account_holder_name || data.full_name || 'Account Holder');
        } else {
          setError('Account not found in Aura Bank. Please check the account number.');
        }
      } else {
        // For other banks, simulate verification (in real app, use IMPS/NEFT API)
        // Simulate a delay for verification
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock verification - in production this would use actual bank APIs
        const mockNames = ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Gupta', 'Vikram Singh'];
        const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];

        setVerifiedRecipient({
          name: randomName,
          accountNumber: recipient,
          bank: otherBankName || 'Other Bank',
          isVerified: true,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(randomName)}&background=10b981&color=fff`
        });
        setRecipientName(randomName);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Unable to verify account. Please check the details and try again.');
    } finally {
      setVerifying(false);
    }
  };

  // Proceed to PIN entry
  const handleContinueToPin = () => {
    if (!verifiedRecipient) {
      setError('Please verify the recipient account first.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (parseFloat(amount) > accountBalance) {
      setError(`Insufficient balance. Available: $${accountBalance.toLocaleString()}`);
      return;
    }
    setError(null);
    setStep(4); // Go to PIN entry
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

    // Validate account exists
    if (!accountId) {
      setError('No account found. Please ensure you are logged in properly.');
      setLoading(false);
      return;
    }

    // Validate amount
    const transferAmount = parseFloat(amount);
    if (transferAmount > accountBalance) {
      setError(`Insufficient balance. Available: $${accountBalance.toLocaleString()}`);
      setLoading(false);
      return;
    }

    try {
      // Prepare transfer data
      const transferPayload: any = {
        from_account_id: accountId,
        to_account_number: recipient,
        amount: transferAmount,
        description: `Transfer to ${recipientName} (${bankType === 'AURA' ? 'Aura Bank' : otherBankName || 'Other Bank'})`,
        pin: pinCode,
      };

      // Add external bank fields for non-Aura transfers
      if (bankType === 'OTHER') {
        transferPayload.destination_bank = otherBankName;
        transferPayload.ifsc_code = otherBankIFSC;
        transferPayload.transfer_type = 'DOMESTIC';
      }

      // Call the actual API
      const response = await transactionApi.transfer(transferPayload);

      if (response.success) {
        // Generate reference ID from response or create one
        setReferenceId((response.data as any)?.reference_id || `AURA-${Date.now().toString(36).toUpperCase()}`);

        // Call the parent callback to update local state
        onTransfer({
          type: 'TRANSFER',
          amount: transferAmount,
          description: `To ${recipientName}`
        });

        setStep(5); // Success
      } else {
        // Check if it's a PIN error
        if (response.error?.toLowerCase().includes('pin') || response.error?.toLowerCase().includes('incorrect')) {
          setError('Incorrect PIN. Please try again.');
        } else {
          setError(response.error || 'Transfer failed. Please try again.');
        }
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
    setBankType(beneficiary.bank === 'Aura Bank' ? 'AURA' : 'OTHER');
    if (beneficiary.bank !== 'Aura Bank') {
      setOtherBankName(beneficiary.bank || '');
    }
    setVerifiedRecipient({
      name: beneficiary.name,
      accountNumber: beneficiary.accountNumber,
      bank: beneficiary.bank || 'Aura Bank',
      isVerified: true,
      avatar: beneficiary.avatar
    });
    setStep(3); // Go directly to review
  };

  const resetForm = () => {
    setStep(1);
    setBankType(null);
    setAmount('');
    setRecipient('');
    setRecipientName('');
    setOtherBankName('');
    setOtherBankIFSC('');
    setPin(['', '', '', '']);
    setError(null);
    setReferenceId('');
    setVerifiedRecipient(null);
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

          {/* Step 1: Bank Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-slide-in-right">
              {!accountId ? (
                <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-5xl text-red-500 mb-4">account_balance_wallet</span>
                  <h3 className="font-bold text-xl text-red-700 dark:text-red-400 mb-2">No Active Account</h3>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                    You need an active checking or savings account to make transfers.
                    Please complete your KYC verification or contact support.
                  </p>
                  <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all">
                    Complete KYC Setup
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2">Select Transfer Type</h3>
                    <p className="text-sm text-slate-500">Choose where you want to send money</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => { setBankType('AURA'); setStep(2); }}
                      className="p-6 bg-gradient-to-br from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/30 border-2 border-primary/30 hover:border-primary rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <div className="size-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-2xl">account_balance</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">Within Aura Bank</h4>
                      <p className="text-sm text-slate-500">Instant transfer to any Aura Bank account</p>
                      <div className="flex items-center gap-2 mt-4 text-primary font-bold text-sm">
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Instant • Free
                      </div>
                    </button>

                    <button
                      onClick={() => { setBankType('OTHER'); setStep(2); }}
                      className="p-6 bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/30 border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <div className="size-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                        <span className="material-symbols-outlined text-white text-2xl">public</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">Other Bank (IMPS/NEFT)</h4>
                      <p className="text-sm text-slate-500">Transfer to any bank in the network</p>
                      <div className="flex items-center gap-2 mt-4 text-emerald-600 font-bold text-sm">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        Up to 2 hrs • Small fee
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Enter Account Details */}
          {step === 2 && (
            <div className="space-y-6 animate-slide-in-right">
              <button onClick={() => { setStep(1); setVerifiedRecipient(null); }} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span className="text-sm font-medium">Back to bank selection</span>
              </button>

              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className={`size-12 ${bankType === 'AURA' ? 'bg-primary' : 'bg-emerald-500'} rounded-xl flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white">{bankType === 'AURA' ? 'account_balance' : 'public'}</span>
                </div>
                <div>
                  <h4 className="font-bold">{bankType === 'AURA' ? 'Aura Bank Transfer' : 'Other Bank Transfer'}</h4>
                  <p className="text-xs text-slate-500">{bankType === 'AURA' ? 'Instant transfer within Aura Bank' : 'IMPS/NEFT transfer to other banks'}</p>
                </div>
              </div>

              <div className="space-y-4">
                {bankType === 'OTHER' && (
                  <>
                    <label className="block space-y-2">
                      <span className="text-sm font-bold">Bank Name</span>
                      <select
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary"
                        value={otherBankName}
                        onChange={(e) => setOtherBankName(e.target.value)}
                      >
                        <option value="">Select Bank</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="State Bank of India">State Bank of India</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Bank">Kotak Bank</option>
                        <option value="Yes Bank">Yes Bank</option>
                        <option value="Punjab National Bank">Punjab National Bank</option>
                      </select>
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-bold">IFSC Code</span>
                      <input
                        type="text"
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary uppercase"
                        placeholder="HDFC0001234"
                        value={otherBankIFSC}
                        onChange={(e) => setOtherBankIFSC(e.target.value.toUpperCase())}
                      />
                    </label>
                  </>
                )}

                <label className="block space-y-2">
                  <span className="text-sm font-bold">Account Number</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">account_box</span>
                    <input
                      type="text"
                      className="w-full h-12 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder={bankType === 'AURA' ? 'Enter Aura Bank account number' : 'Enter beneficiary account number'}
                      value={recipient}
                      onChange={(e) => { setRecipient(e.target.value); setVerifiedRecipient(null); }}
                    />
                  </div>
                </label>

                {/* Verify Button */}
                {recipient.length >= 8 && !verifiedRecipient && (
                  <button
                    onClick={handleVerifyAccount}
                    disabled={verifying || (bankType === 'OTHER' && (!otherBankName || !otherBankIFSC))}
                    className="w-full h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        Verifying Account...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Verify Account
                      </>
                    )}
                  </button>
                )}

                {/* Verified Recipient Card (Like PhonePe/GPay) */}
                {verifiedRecipient && (
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl animate-slide-up">
                    <div className="flex items-center gap-4">
                      <img
                        src={verifiedRecipient.avatar}
                        alt=""
                        className="size-14 rounded-full border-3 border-green-500 shadow-lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg">{verifiedRecipient.name}</h4>
                          <span className="material-symbols-outlined text-green-500 text-lg">verified</span>
                        </div>
                        <p className="text-sm text-slate-500">{verifiedRecipient.bank}</p>
                        <p className="text-xs text-slate-400 font-mono">••••{verifiedRecipient.accountNumber.slice(-4)}</p>
                      </div>
                      <button
                        onClick={() => { setVerifiedRecipient(null); setRecipient(''); }}
                        className="size-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Amount Input (only show after verification) */}
                {verifiedRecipient && (
                  <label className="block space-y-2 animate-slide-up">
                    <span className="text-sm font-bold">Amount to Transfer</span>
                    <div className="relative">
                      <span className="absolute left-4 top-3 font-bold text-slate-400 text-xl">$</span>
                      <input
                        type="number"
                        className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-2xl font-bold transition-all"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <p className="text-sm text-slate-500">Available balance: <span className="font-bold text-primary">${accountBalance.toLocaleString()}</span></p>
                  </label>
                )}
              </div>

              {verifiedRecipient && (
                <button
                  onClick={handleContinueToPin}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continue to Pay
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}
            </div>
          )}

          {/* Step 3: Quick Transfer Review (from beneficiary selection) */}
          {step === 3 && (
            <div className="space-y-6 animate-slide-in-right">
              <button onClick={() => { setStep(1); setVerifiedRecipient(null); setAmount(''); }} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span className="text-sm font-medium">Start over</span>
              </button>

              {/* Verified Recipient Card */}
              {verifiedRecipient && (
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <img
                      src={verifiedRecipient.avatar}
                      alt=""
                      className="size-16 rounded-full border-3 border-green-500 shadow-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-xl">{verifiedRecipient.name}</h4>
                        <span className="material-symbols-outlined text-green-500">verified</span>
                      </div>
                      <p className="text-sm text-slate-500">{verifiedRecipient.bank}</p>
                      <p className="text-xs text-slate-400 font-mono">Account: ••••{verifiedRecipient.accountNumber.slice(-4)}</p>
                    </div>
                  </div>
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-bold">Amount to Transfer</span>
                <div className="relative">
                  <span className="absolute left-4 top-3 font-bold text-slate-400 text-xl">$</span>
                  <input
                    type="number"
                    className="w-full h-14 pl-12 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-2xl font-bold transition-all"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <p className="text-sm text-slate-500">Available balance: <span className="font-bold text-primary">${accountBalance.toLocaleString()}</span></p>
              </label>

              <button
                onClick={handleContinueToPin}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Continue to Pay
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Step 4: PIN Entry */}
          {step === 4 && (
            <div className="space-y-8 animate-slide-in-right">
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-2">You are sending</p>
                <h3 className="text-5xl font-black text-primary">${parseFloat(amount).toLocaleString()}</h3>
                <div className="flex items-center justify-center gap-3 mt-4">
                  {verifiedRecipient && (
                    <>
                      <img src={verifiedRecipient.avatar} alt="" className="size-10 rounded-full" />
                      <div className="text-left">
                        <p className="font-bold">{verifiedRecipient.name}</p>
                        <p className="text-xs text-slate-400">{verifiedRecipient.bank} • ••••{verifiedRecipient.accountNumber.slice(-4)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest">Enter 4-Digit Security PIN</p>
                <div className="flex justify-center gap-4">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      type="password"
                      maxLength={1}
                      value={digit}
                      className="size-16 text-center text-3xl font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-primary focus:ring-0 transition-all"
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
                      onKeyDown={(e) => {
                        // Handle backspace
                        if (e.key === 'Backspace' && !digit && i > 0) {
                          const prevInput = e.currentTarget.parentElement?.children[i - 1] as HTMLInputElement;
                          prevInput?.focus();
                        }
                      }}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-slate-400">Use your transaction PIN to authorize this payment</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => { setStep(verifiedRecipient ? 2 : 1); setPin(['', '', '', '']); setError(null); }}
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
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">lock</span>
                      Pay ${parseFloat(amount).toLocaleString()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="text-center space-y-6 animate-slide-up">
              <div className="size-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-6xl">check_circle</span>
              </div>
              <h3 className="text-3xl font-bold">Payment Successful! 🎉</h3>
              <p className="text-slate-500">
                <span className="text-2xl font-bold text-primary">${parseFloat(amount).toLocaleString()}</span> has been sent to <span className="font-bold">{recipientName}</span>
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 uppercase font-bold mb-1">Reference ID</p>
                <p className="font-mono text-primary font-bold">{referenceId}</p>
              </div>
              <button onClick={resetForm} className="w-full h-14 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
                Make Another Transfer
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-4 space-y-6">
          <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-bold mb-4">Quick Transfer</h3>
            <p className="text-xs text-slate-500 mb-4">Send to saved beneficiaries</p>
            <div className="space-y-3">
              {beneficiaries.map((p, i) => (
                <button key={i} onClick={() => handleSelectBeneficiary(p)} className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95 border border-transparent hover:border-primary/20">
                  <img src={p.avatar} className="size-10 rounded-full" alt="" />
                  <div className="text-left flex-1">
                    <span className="font-bold text-sm block">{p.name}</span>
                    <span className="text-xs text-slate-400">{p.bank || 'Aura Bank'}</span>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </button>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:border-primary hover:text-primary transition-all active:scale-95">
                + Add Beneficiary
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-primary p-6 rounded-3xl text-white">
            <span className="material-symbols-outlined text-3xl mb-3">verified_user</span>
            <h4 className="font-bold text-lg mb-2">Bank-Grade Security</h4>
            <p className="text-sm text-blue-100">All transactions use 256-bit SSL encryption with real-time fraud detection.</p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
            <h4 className="font-bold text-sm mb-2">Transfer Limits</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Daily Limit</span>
                <span className="font-bold">$50,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Per Transaction</span>
                <span className="font-bold">$25,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
