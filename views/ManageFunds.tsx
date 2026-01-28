
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserState, Transaction, LinkedBank, PendingDeposit } from '../types';
import { accountApi, withdrawalApi } from '../src/services/api';

interface ManageFundsProps {
  user: UserState;
  onUpdate: (tx: Omit<Transaction, 'id' | 'date' | 'status'>) => void;
  onUserUpdate?: (updates: Partial<UserState>) => void;
}

// =============================================
// MOCK DATA FOR DEMO
// =============================================
const MOCK_BANKS = [
  { id: 'chase', name: 'Chase Bank', logo: '🏦', color: 'bg-blue-600' },
  { id: 'citi', name: 'Citibank', logo: '🏛️', color: 'bg-blue-500' },
  { id: 'bofa', name: 'Bank of America', logo: '🔴', color: 'bg-red-600' },
  { id: 'wells', name: 'Wells Fargo', logo: '🟡', color: 'bg-yellow-600' },
  { id: 'capital', name: 'Capital One', logo: '💳', color: 'bg-orange-500' },
];

const ATM_LOCATIONS = [
  { id: 1, name: 'Financial Dist. Branch', dist: '0.4 mi', address: '123 Market St', x: 45, y: 35 },
  { id: 2, name: 'Westfield Mall ATM', dist: '1.2 mi', address: '865 Market St', x: 65, y: 55 },
  { id: 3, name: 'Union Square Hub', dist: '2.5 mi', address: '333 Powell St', x: 25, y: 70 },
  { id: 4, name: 'Embarcadero Center', dist: '0.8 mi', address: '4 Embarcadero Ctr', x: 80, y: 25 },
];

// =============================================
// SUB-COMPONENTS
// =============================================

// Withdrawal Limit Progress Bar
const WithdrawalLimitBar = ({ dailyUsage, limit }: { dailyUsage: number, limit: number }) => {
  const percentage = Math.min((dailyUsage / limit) * 100, 100);
  const isNearLimit = percentage > 80;
  const remaining = Math.max(limit - dailyUsage, 0);

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Daily Cash Limit</h4>
          <p className="font-bold text-slate-700 dark:text-slate-200">
            ${dailyUsage.toLocaleString()} / ${limit.toLocaleString()}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${isNearLimit ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
          ${remaining.toLocaleString()} Remaining
        </span>
      </div>
      
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${isNearLimit ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[12px]">info</span>
        Limits reset at midnight. Contact support to increase.
      </p>
    </div>
  );
};

// Safe to Spend Indicator
const SafeToSpendCard = ({ balance, pendingBills }: { balance: number, pendingBills: number }) => {
  const safeAmount = Math.max(balance - pendingBills, 0);
  const safePercentage = balance > 0 ? (safeAmount / balance) * 100 : 0;
  
  return (
    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-emerald-200">psychology</span>
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-100">AI Spending Insight</h4>
      </div>
      <p className="text-3xl font-black">${safeAmount.toLocaleString()}</p>
      <p className="text-xs text-emerald-100 mt-1">Safe to withdraw today</p>
      <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${safePercentage}%` }} />
      </div>
      <p className="text-[10px] text-emerald-200 mt-2">
        ${pendingBills.toLocaleString()} reserved for upcoming bills
      </p>
    </div>
  );
};

// ATM Map Component
const ATMLocatorMap = ({ 
  locations, 
  selectedAtm, 
  onSelectAtm 
}: { 
  locations: typeof ATM_LOCATIONS, 
  selectedAtm: typeof ATM_LOCATIONS[0] | null, 
  onSelectAtm: (atm: typeof ATM_LOCATIONS[0]) => void 
}) => {
  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <h4 className="font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">map</span>
        ATM Locations
      </h4>
      
      {/* Map Container */}
      <div className="relative w-full h-48 bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-2xl overflow-hidden mb-3">
        {/* Simulated map background with grid */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-400"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Roads simulation */}
        <div className="absolute top-1/2 left-0 right-0 h-2 bg-slate-300 dark:bg-slate-700 opacity-50"></div>
        <div className="absolute top-0 bottom-0 left-1/3 w-2 bg-slate-300 dark:bg-slate-700 opacity-50"></div>
        
        {/* ATM Pins */}
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => onSelectAtm(loc)}
            className={`absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 hover:scale-110 ${
              selectedAtm?.id === loc.id ? 'scale-125 z-10' : ''
            }`}
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
          >
            <div className={`relative ${selectedAtm?.id === loc.id ? 'animate-bounce' : ''}`}>
              <span className={`material-symbols-outlined text-3xl ${
                selectedAtm?.id === loc.id ? 'text-primary' : 'text-red-500'
              }`}>
                location_on
              </span>
              {selectedAtm?.id === loc.id && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                  {loc.name}
                </div>
              )}
            </div>
          </button>
        ))}
        
        {/* You are here marker */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
        </div>
      </div>
      
      {/* Location List */}
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {locations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => onSelectAtm(loc)}
            className={`w-full flex justify-between items-center text-sm p-2 rounded-xl transition-all ${
              selectedAtm?.id === loc.id 
                ? 'bg-primary/10 border border-primary' 
                : 'hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <div className="text-left">
              <span className={`font-medium ${selectedAtm?.id === loc.id ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>
                {loc.name}
              </span>
              <p className="text-[10px] text-slate-400">{loc.address}</p>
            </div>
            <span className={`font-bold text-xs ${selectedAtm?.id === loc.id ? 'text-primary' : ''}`}>{loc.dist}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// Link Bank Modal
const LinkBankModal = ({ 
  isOpen, 
  onClose, 
  onLink 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onLink: (bank: LinkedBank) => void 
}) => {
  const [step, setStep] = useState<'select' | 'login' | 'connecting' | 'success'>('select');
  const [selectedBank, setSelectedBank] = useState<typeof MOCK_BANKS[0] | null>(null);
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const handleSelectBank = (bank: typeof MOCK_BANKS[0]) => {
    setSelectedBank(bank);
    setStep('login');
  };

  const handleConnect = async () => {
    setStep('connecting');
    // Simulate connection delay
    await new Promise(r => setTimeout(r, 2500));
    setStep('success');
    
    // Create linked bank
    const newBank: LinkedBank = {
      id: `linked_${Date.now()}`,
      bankName: selectedBank!.name,
      bankLogo: selectedBank!.logo,
      accountLast4: Math.floor(1000 + Math.random() * 9000).toString(),
      accountType: 'Checking',
      linkedAt: new Date().toISOString(),
      isDefault: false,
    };
    
    setTimeout(() => {
      onLink(newBank);
      onClose();
      // Reset modal state
      setStep('select');
      setSelectedBank(null);
      setCredentials({ username: '', password: '' });
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white">link</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Link Bank Account</h3>
                <p className="text-xs text-slate-500">Secure connection via Plaid</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">Select your bank to continue</p>
              {MOCK_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => handleSelectBank(bank)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className={`w-12 h-12 ${bank.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {bank.logo}
                  </div>
                  <span className="font-bold">{bank.name}</span>
                  <span className="material-symbols-outlined ml-auto text-slate-400">chevron_right</span>
                </button>
              ))}
            </div>
          )}

          {step === 'login' && selectedBank && (
            <div className="space-y-4">
              <button onClick={() => setStep('select')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back
              </button>
              
              <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className={`w-10 h-10 ${selectedBank.color} rounded-xl flex items-center justify-center text-xl`}>
                  {selectedBank.logo}
                </div>
                <span className="font-bold">{selectedBank.name}</span>
              </div>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <button
                onClick={handleConnect}
                disabled={!credentials.username || !credentials.password}
                className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all"
              >
                Connect Account
              </button>
              
              <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[10px]">lock</span>
                256-bit encryption • Your credentials are never stored
              </p>
            </div>
          )}

          {step === 'connecting' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl animate-spin">sync</span>
              </div>
              <div>
                <h4 className="font-bold">Connecting to {selectedBank?.name}</h4>
                <p className="text-sm text-slate-500">Please wait while we establish a secure connection...</p>
              </div>
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-green-600">Successfully Connected!</h4>
                <p className="text-sm text-slate-500">Your {selectedBank?.name} account has been linked.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Cheque Deposit Modal
const ChequeDepositModal = ({ 
  isOpen, 
  onClose, 
  onDeposit 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onDeposit: (deposit: PendingDeposit) => void 
}) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'confirm' | 'success'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [scannedAmount, setScannedAmount] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    setStep('scanning');
    setScanProgress(0);
    
    // Simulate OCR scanning
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200));
      setScanProgress(i);
    }
    
    // Generate random amount between 100 and 5000
    setScannedAmount(Math.floor(100 + Math.random() * 4900));
    setStep('confirm');
  };

  const handleConfirm = () => {
    const deposit: PendingDeposit = {
      id: `cheque_${Date.now()}`,
      amount: scannedAmount,
      type: 'CHEQUE',
      description: 'Mobile Cheque Deposit',
      createdAt: new Date().toISOString(),
      clearsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      imageUrl: uploadedImage || undefined,
    };
    
    setStep('success');
    setTimeout(() => {
      onDeposit(deposit);
      onClose();
      // Reset
      setStep('upload');
      setUploadedImage(null);
      setScannedAmount(0);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white">document_scanner</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">Deposit Cheque</h3>
                <p className="text-xs text-slate-500">Scan and deposit instantly</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              
              {!uploadedImage ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <span className="material-symbols-outlined text-4xl text-slate-400">photo_camera</span>
                  <div className="text-center">
                    <p className="font-bold text-slate-600 dark:text-slate-300">Take a photo or upload</p>
                    <p className="text-xs text-slate-400">JPEG, PNG up to 10MB</p>
                  </div>
                </button>
              ) : (
                <div className="relative">
                  <img src={uploadedImage} alt="Cheque" className="w-full h-48 object-cover rounded-2xl" />
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
              
              <button
                onClick={handleScan}
                disabled={!uploadedImage}
                className="w-full py-3 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">document_scanner</span>
                Scan Cheque
              </button>
            </div>
          )}

          {step === 'scanning' && (
            <div className="py-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto relative">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-primary rounded-full transition-all duration-300"
                  style={{ 
                    clipPath: `inset(0 ${100 - scanProgress}% 0 0)`,
                  }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{scanProgress}%</span>
                </div>
              </div>
              <div>
                <h4 className="font-bold">Scanning Cheque...</h4>
                <p className="text-sm text-slate-500">
                  {scanProgress < 30 && 'Analyzing image quality...'}
                  {scanProgress >= 30 && scanProgress < 60 && 'Reading MICR code...'}
                  {scanProgress >= 60 && scanProgress < 90 && 'Extracting amount...'}
                  {scanProgress >= 90 && 'Verifying details...'}
                </p>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
                <p className="text-xs text-slate-500 mb-1">Detected Amount</p>
                <p className="text-4xl font-black text-primary">${scannedAmount.toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-500">schedule</span>
                  <div>
                    <p className="font-bold text-amber-700 dark:text-amber-400">24-Hour Hold</p>
                    <p className="text-amber-600 dark:text-amber-300">Funds will be available tomorrow after clearing.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('upload'); setUploadedImage(null); }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Retake
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 bg-success hover:bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Confirm Deposit
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
              </div>
              <div>
                <h4 className="font-bold text-green-600">Cheque Submitted!</h4>
                <p className="text-sm text-slate-500">${scannedAmount.toLocaleString()} will clear in 24 hours</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// QR Code Deposit Component
const QRCodeDeposit = ({ onDeposit }: { onDeposit: (amount: number) => void }) => {
  const [showQR, setShowQR] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [upiId] = useState(`aurabank${Date.now().toString().slice(-6)}@aura`);
  
  // Generate a proper UPI payment URL that can be scanned by payment apps
  const qrCodeData = `upi://pay?pa=${upiId}&pn=Aura%20Bank&cu=USD&tn=Account%20Load`;

  const handleSimulateScan = async () => {
    setSimulating(true);
    await new Promise(r => setTimeout(r, 2000));
    const amount = Math.floor(50 + Math.random() * 450); // Random $50-$500
    onDeposit(amount);
    setSimulating(false);
    setShowQR(false);
  };

  return (
    <div className="p-4 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl text-white">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined">qr_code_2</span>
        <div>
          <h4 className="font-bold text-sm">Load via QR / UPI</h4>
          <p className="text-[10px] text-violet-200">Instant transfer from any app</p>
        </div>
      </div>
      
      {!showQR ? (
        <button
          onClick={() => setShowQR(true)}
          className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all"
        >
          Show QR Code
        </button>
      ) : (
        <div className="space-y-3">
          {/* Real QR Code using qrcode.react */}
          <div className="bg-white p-4 rounded-xl">
            <div className="flex items-center justify-center">
              <QRCodeSVG 
                value={qrCodeData}
                size={160}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
                imageSettings={{
                  src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230ea5e9'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'/%3E%3C/svg%3E",
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-center text-xs text-slate-600 mt-2 font-medium">
              Scan with any payment app
            </p>
            <p className="text-center text-[10px] text-slate-400 mt-1">
              UPI ID: {upiId}
            </p>
          </div>
          
          <button
            onClick={handleSimulateScan}
            disabled={simulating}
            className="w-full py-2 bg-white text-purple-600 hover:bg-purple-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            {simulating ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                Processing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">smartphone</span>
                Simulate Scan
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowQR(false)}
            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs"
          >
            Hide QR
          </button>
        </div>
      )}
    </div>
  );
};

// Auto Top-Up Settings Component
const AutoTopUpSettings = ({ 
  settings, 
  linkedBanks,
  onUpdate 
}: { 
  settings: UserState['autoTopUp'], 
  linkedBanks: LinkedBank[],
  onUpdate: (settings: UserState['autoTopUp']) => void 
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleToggle = () => {
    const newSettings = { ...localSettings, enabled: !localSettings.enabled };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  const handleChange = (field: keyof typeof localSettings, value: any) => {
    const newSettings = { ...localSettings, [field]: value };
    setLocalSettings(newSettings);
    onUpdate(newSettings);
  };

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white">auto_mode</span>
          </div>
          <div>
            <h4 className="font-bold text-sm">Auto Top-Up</h4>
            <p className="text-[10px] text-slate-500">Never run low on cash</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-14 h-8 rounded-full transition-all ${localSettings.enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${localSettings.enabled ? 'left-7' : 'left-1'}`} />
        </button>
      </div>
      
      {localSettings.enabled && (
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">When balance drops below</span>
            <select
              value={localSettings.threshold}
              onChange={(e) => handleChange('threshold', parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold border-none"
            >
              <option value={25}>$25</option>
              <option value={50}>$50</option>
              <option value={100}>$100</option>
              <option value={200}>$200</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Auto-deposit amount</span>
            <select
              value={localSettings.topUpAmount}
              onChange={(e) => handleChange('topUpAmount', parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold border-none"
            >
              <option value={50}>$50</option>
              <option value={100}>$100</option>
              <option value={200}>$200</option>
              <option value={500}>$500</option>
            </select>
          </div>
          
          {linkedBanks.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">From account</span>
              <select
                value={localSettings.sourceBank || ''}
                onChange={(e) => handleChange('sourceBank', e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-bold border-none max-w-[140px]"
              >
                {linkedBanks.map(bank => (
                  <option key={bank.id} value={bank.id}>{bank.bankName} ••••{bank.accountLast4}</option>
                ))}
              </select>
            </div>
          )}
          
          <p className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">info</span>
            You'll receive a notification when auto top-up is triggered
          </p>
        </div>
      )}
    </div>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================
const ManageFunds: React.FC<ManageFundsProps> = ({ user, onUpdate, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [depositMethod, setDepositMethod] = useState<'CARD' | 'LINKED' | 'CHEQUE' | 'QR'>('CARD');
  const [amount, setAmount] = useState('');
  const [atmCode, setAtmCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [showLinkBankModal, setShowLinkBankModal] = useState(false);
  const [showChequeModal, setShowChequeModal] = useState(false);
  
  // ATM Map state
  const [selectedAtm, setSelectedAtm] = useState<typeof ATM_LOCATIONS[0] | null>(null);
  
  // Derived state with defaults
  const linkedBanks = user.linkedBanks || [];
  const pendingDeposits = user.pendingDeposits || [];
  const dailyWithdrawalUsed = user.dailyWithdrawalUsed || 0;
  const dailyWithdrawalLimit = user.dailyWithdrawalLimit || 1000;
  const autoTopUp = user.autoTopUp || { enabled: false, threshold: 50, topUpAmount: 100 };
  const upcomingBills = user.upcomingBills || [];
  const pendingBillsTotal = upcomingBills.reduce((sum, bill) => sum + bill.amount, 0);
  const pendingDepositsTotal = pendingDeposits.filter(d => d.status === 'PENDING').reduce((sum, d) => sum + d.amount, 0);

  // Check if user has an account
  const accountId = user.accounts?.[0]?.id;
  const hasAccount = !!accountId;

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

  // Handle linked bank addition
  const handleLinkBank = (bank: LinkedBank) => {
    const newLinkedBanks = [...linkedBanks, bank];
    onUserUpdate?.({ linkedBanks: newLinkedBanks } as any);
    setSuccess(`${bank.bankName} account ending in ${bank.accountLast4} linked successfully!`);
  };

  // Handle cheque deposit
  const handleChequeDeposit = (deposit: PendingDeposit) => {
    const newPendingDeposits = [...pendingDeposits, deposit];
    onUserUpdate?.({ pendingDeposits: newPendingDeposits } as any);
    setSuccess(`Cheque for $${deposit.amount.toLocaleString()} submitted! Funds will clear in 24 hours.`);
  };

  // Handle QR deposit (instant)
  const handleQRDeposit = async (depositAmount: number) => {
    try {
      if (accountId) {
        const response = await accountApi.deposit(accountId, depositAmount, 'QR/UPI Instant Load');
        if (response.success) {
          onUpdate({ type: 'DEPOSIT', amount: depositAmount, description: 'QR/UPI Instant Load' });
          setSuccess(`$${depositAmount.toLocaleString()} loaded instantly via QR!`);
        }
      }
    } catch (err) {
      setError('QR deposit failed. Please try again.');
    }
  };

  // Handle auto top-up settings update
  const handleAutoTopUpUpdate = (settings: typeof autoTopUp) => {
    onUserUpdate?.({ autoTopUp: settings } as any);
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
      if (!accountId) {
        setError('No account found. Please complete KYC to access this feature.');
        return;
      }

      const description = depositMethod === 'LINKED' && linkedBanks.length > 0 
        ? `Transfer from ${linkedBanks[0].bankName}` 
        : 'Manual Deposit';
      
      const response = await accountApi.deposit(accountId, parseFloat(amount), description);
      
      if (response.success) {
        setSuccess(`Successfully deposited $${parseFloat(amount).toLocaleString()}`);
        onUpdate({ type: 'DEPOSIT', amount: parseFloat(amount), description });
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

    const withdrawalAmount = parseFloat(amount);

    if (withdrawalAmount > user.balance) {
      setError('Insufficient balance for this withdrawal');
      return;
    }

    // Check daily limit
    if (dailyWithdrawalUsed + withdrawalAmount > dailyWithdrawalLimit) {
      setError(`This withdrawal would exceed your daily limit of $${dailyWithdrawalLimit.toLocaleString()}. You have $${(dailyWithdrawalLimit - dailyWithdrawalUsed).toLocaleString()} remaining today.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!accountId) {
        setError('No account found. Please complete KYC to access this feature.');
        return;
      }

      const response = await withdrawalApi.generateAtmCode(accountId, withdrawalAmount);
      
      if (response.success && response.data) {
        const data = response.data as any;
        setAtmCode(data.code || data.atm_code);
        setTimer(900); // 15 minutes
        setSuccess(`ATM code generated${selectedAtm ? ` for ${selectedAtm.name}` : ''}!`);
        
        // Update daily usage
        onUserUpdate?.({ dailyWithdrawalUsed: dailyWithdrawalUsed + withdrawalAmount } as any);
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
    <div className="max-w-6xl mx-auto space-y-8 animate-slide-up">
      {/* Modals */}
      <LinkBankModal 
        isOpen={showLinkBankModal} 
        onClose={() => setShowLinkBankModal(false)} 
        onLink={handleLinkBank} 
      />
      <ChequeDepositModal 
        isOpen={showChequeModal} 
        onClose={() => setShowChequeModal(false)} 
        onDeposit={handleChequeDeposit} 
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Manage Funds</h2>
          <p className="text-slate-500">Securely move money in and out of your account.</p>
        </div>
        
        {/* Linked Banks Quick Access */}
        {linkedBanks.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Linked:</span>
            {linkedBanks.slice(0, 3).map((bank) => (
              <div key={bank.id} className="flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                <span>{bank.bankLogo}</span>
                <span className="font-medium">••••{bank.accountLast4}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* No Account State */}
      {!hasAccount && (
        <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-center">
            <span className="material-symbols-outlined text-5xl text-red-500 mb-4">account_balance_wallet</span>
            <h3 className="font-bold text-xl text-red-700 dark:text-red-400 mb-2">No Active Account</h3>
            <p className="text-sm text-red-600 dark:text-red-300 mb-4">
              You need an active checking or savings account to deposit or withdraw funds. 
              Please complete your KYC verification or contact support.
            </p>
            <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-all">
              Complete KYC Setup
            </button>
          </div>
        </div>
      )}

      {hasAccount && (
        <>
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

      {/* Pending Deposits Banner */}
      {pendingDeposits.filter(d => d.status === 'PENDING').length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-500">schedule</span>
            <div className="flex-1">
              <p className="font-bold text-amber-700 dark:text-amber-400">Pending Deposits</p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                ${pendingDepositsTotal.toLocaleString()} awaiting clearance
              </p>
            </div>
            <div className="text-right">
              {pendingDeposits.filter(d => d.status === 'PENDING').map((d, i) => (
                <div key={d.id} className="text-xs text-amber-600 dark:text-amber-300">
                  {d.type}: ${d.amount.toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Panel */}
        <div className="lg:col-span-8 bg-surface-light dark:bg-surface-dark p-1 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
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
            {activeTab === 'DEPOSIT' && (
              <>
                {/* Deposit Method Selection */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[
                    { id: 'CARD', icon: 'credit_card', label: 'Card' },
                    { id: 'LINKED', icon: 'account_balance', label: 'Bank', disabled: linkedBanks.length === 0 },
                    { id: 'CHEQUE', icon: 'document_scanner', label: 'Cheque' },
                    { id: 'QR', icon: 'qr_code_2', label: 'QR/UPI' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        if (method.id === 'CHEQUE') {
                          setShowChequeModal(true);
                        } else {
                          setDepositMethod(method.id as any);
                        }
                      }}
                      disabled={method.disabled}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        depositMethod === method.id 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 disabled:opacity-40'
                      }`}
                    >
                      <span className="material-symbols-outlined">{method.icon}</span>
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'WITHDRAWAL' && (
              <WithdrawalLimitBar dailyUsage={dailyWithdrawalUsed} limit={dailyWithdrawalLimit} />
            )}

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
                      disabled={loading || (activeTab === 'WITHDRAWAL' && atmCode !== '') || depositMethod === 'QR'}
                    />
                 </div>
               </label>

               <div className="flex gap-2">
                 {[100, 500, 1000, 5000].map(val => (
                   <button 
                    key={val} 
                    onClick={() => setAmount(val.toString())}
                    disabled={loading || (activeTab === 'WITHDRAWAL' && atmCode !== '') || depositMethod === 'QR'}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
                   >
                     +${val}
                   </button>
                 ))}
               </div>
            </div>

            {activeTab === 'DEPOSIT' ? (
              <div className="space-y-6 animate-slide-in-right">
                {depositMethod === 'CARD' && (
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
                )}

                {depositMethod === 'LINKED' && linkedBanks.length > 0 && (
                  <div className="space-y-3">
                    {linkedBanks.map((bank) => (
                      <div key={bank.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-4">
                        <div className="size-10 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center shadow-sm text-xl">
                          {bank.bankLogo}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{bank.bankName}</p>
                          <p className="text-xs text-slate-500">{bank.accountType} •••• {bank.accountLast4}</p>
                        </div>
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                      </div>
                    ))}
                  </div>
                )}

                {depositMethod === 'QR' && (
                  <QRCodeDeposit onDeposit={handleQRDeposit} />
                )}

                {depositMethod !== 'QR' && (
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
                      <>
                        <span className="material-symbols-outlined">add</span>
                        Add Funds
                      </>
                    )}
                  </button>
                )}

                {/* Link New Bank Button */}
                <button
                  onClick={() => setShowLinkBankModal(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">add_link</span>
                  Link New Bank Account
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-slide-in-right">
                {/* ATM Selection */}
                {selectedAtm && !atmCode && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-4">
                    <span className="material-symbols-outlined text-blue-500">location_on</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-blue-700 dark:text-blue-400">Selected ATM</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">{selectedAtm.name} - {selectedAtm.address}</p>
                    </div>
                    <button onClick={() => setSelectedAtm(null)} className="text-blue-400 hover:text-blue-600">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                )}

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
                      <>
                        <span className="material-symbols-outlined">pin</span>
                        Generate ATM Code
                      </>
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
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-sm text-slate-500">Withdrawal Amount: <span className="font-bold text-primary">${parseFloat(amount).toLocaleString()}</span></p>
                      {selectedAtm && (
                        <p className="text-xs text-slate-400">At: {selectedAtm.name}</p>
                      )}
                    </div>
                    <button 
                      onClick={() => { setAtmCode(''); setTimer(0); setAmount(''); setSelectedAtm(null); }}
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

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Balance Card */}
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
                  <p className="text-sm font-bold">${pendingDepositsTotal.toLocaleString()}</p>
                </div>
             </div>
          </div>

          {/* Safe to Spend - AI Insight */}
          <SafeToSpendCard balance={user.balance} pendingBills={pendingBillsTotal} />

          {/* Auto Top-Up Settings */}
          <AutoTopUpSettings 
            settings={autoTopUp} 
            linkedBanks={linkedBanks}
            onUpdate={handleAutoTopUpUpdate} 
          />

          {/* ATM Locator Map (Withdrawal Tab) */}
          {activeTab === 'WITHDRAWAL' && (
            <ATMLocatorMap 
              locations={ATM_LOCATIONS} 
              selectedAtm={selectedAtm}
              onSelectAtm={setSelectedAtm}
            />
          )}

          {/* Quick QR Load (Deposit Tab) */}
          {activeTab === 'DEPOSIT' && depositMethod !== 'QR' && (
            <QRCodeDeposit onDeposit={handleQRDeposit} />
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ManageFunds;
