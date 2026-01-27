import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { cardApi, transactionApi, userApi } from '../src/services/api';

interface CardsProps {
  user: UserState;
  onUpdate: (settings: Partial<UserState['settings']>) => void;
}

interface CardData {
  id: string;
  card_number: string;
  card_number_masked?: string;
  card_holder_name: string;
  expiry_date: string;
  card_type: 'DEBIT' | 'CREDIT';
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  daily_limit: number;
  is_international_enabled: boolean;
  is_online_enabled: boolean;
  // Credit card specific fields
  credit_limit?: number;
  available_credit?: number;
  current_balance?: number;
  billing_date?: number;
  due_date?: number;
  minimum_payment?: number;
  rewards_points?: number;
}

interface CardTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
}

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'warning';

  return (
    <div className={`fixed top-4 right-4 z-[100] ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3`}>
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};

const Cards: React.FC<CardsProps> = ({ user, onUpdate }) => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [card, setCard] = useState<CardData | null>(null);
  const [activeTab, setActiveTab] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showStatementsModal, setShowStatementsModal] = useState(false);
  const [showApplyCreditCardModal, setShowApplyCreditCardModal] = useState(false);
  const [pinData, setPinData] = useState({ current: '', new: '', confirm: '' });
  const [pinError, setPinError] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('lost');
  const [blockPassword, setBlockPassword] = useState('');
  const [statements, setStatements] = useState<CardTransaction[]>([]);
  const [statementsLoading, setStatementsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
  };

  const [localSettings, setLocalSettings] = useState({
    cardFrozen: user.settings.cardFrozen,
    intlUse: user.settings.intlUse,
    onlinePayments: user.settings.onlinePayments,
    dailyLimit: user.settings.dailyLimit,
  });

  useEffect(() => {
    const fetchCards = async () => {
      if (!user.id) return;
      setLoading(true);
      try {
        const response = await cardApi.getByUserId(user.id);
        if (response.success && response.data) {
          const allCards = response.data as CardData[];
          setCards(allCards);
          
          // Find card matching active tab, or first available
          const debitCard = allCards.find(c => c.card_type === 'DEBIT' || !c.card_type);
          const creditCard = allCards.find(c => c.card_type === 'CREDIT');
          
          const selectedCard = activeTab === 'CREDIT' ? creditCard : debitCard;
          if (selectedCard) {
            setCard(selectedCard);
            setLocalSettings({
              cardFrozen: selectedCard.status === 'FROZEN',
              intlUse: selectedCard.is_international_enabled,
              onlinePayments: selectedCard.is_online_enabled,
              dailyLimit: selectedCard.daily_limit,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [user.id, activeTab]);

  const fetchStatements = async () => {
    setStatementsLoading(true);
    try {
      if (user.transactions && user.transactions.length > 0) {
        setStatements(user.transactions.map(tx => ({
          id: tx.id, type: tx.type, amount: tx.amount, description: tx.description, date: tx.date, status: tx.status,
        })));
      } else if (user.accounts?.[0]?.id) {
        const response = await transactionApi.getByAccountId(user.accounts[0].id, 20);
        if (response.success && response.data) {
          setStatements((response.data as any[]).map(tx => ({
            id: tx.id, type: tx.type, amount: parseFloat(tx.amount), description: tx.description || '', date: tx.created_at || tx.transaction_date, status: tx.status,
          })));
        }
      }
    } catch (error) {
      showToast('Failed to load statements', 'error');
    } finally {
      setStatementsLoading(false);
    }
  };

  const handleOpenStatements = () => { setShowStatementsModal(true); fetchStatements(); };

  const handleSettingChange = async (key: string, value: boolean | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    onUpdate({ [key]: value });
    if (card) {
      setUpdating(true);
      try {
        let apiUpdate: any = {};
        if (key === 'cardFrozen') apiUpdate = { status: value ? 'FROZEN' : 'ACTIVE' };
        else if (key === 'intlUse') apiUpdate = { is_international_enabled: value };
        else if (key === 'onlinePayments') apiUpdate = { is_online_enabled: value };
        else if (key === 'dailyLimit') apiUpdate = { daily_limit: value };
        await cardApi.update(card.id, apiUpdate);
        if (key === 'cardFrozen') showToast(value ? 'Card frozen successfully' : 'Card unfrozen successfully', 'success');
      } catch (error) {
        setLocalSettings(prev => ({ ...prev, [key]: !value }));
        onUpdate({ [key]: !value });
        showToast('Failed to update settings', 'error');
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleSetPin = async () => {
    if (pinData.new !== pinData.confirm) { setPinError('New PINs do not match'); return; }
    if (pinData.new.length !== 4) { setPinError('PIN must be 4 digits'); return; }
    if (card) {
      try {
        const response = await cardApi.updatePin(card.id, pinData.current, pinData.new);
        if (response.success) {
          setShowPinModal(false);
          setPinData({ current: '', new: '', confirm: '' });
          setPinError(null);
          showToast('PIN updated successfully! Your new PIN is now active.', 'success');
        } else {
          setPinError(response.error || 'Failed to update PIN');
        }
      } catch (error) {
        setPinError('Failed to update PIN');
      }
    }
  };

  const handleBlockCard = async () => {
    if (!blockPassword) { 
      showToast('Please enter your password to confirm', 'warning'); 
      return; 
    }
    
    if (!card) return;

    setUpdating(true);
    try {
      // 1. Verify Password First with backend
      const verifyAuth = await userApi.login(user.email, blockPassword);
      
      if (!verifyAuth.success) {
        showToast('Incorrect password. Cannot block card.', 'error');
        setUpdating(false);
        return;
      }

      // 2. Proceed to Block Card
      await cardApi.reportLost(card.id, blockReason);
      setCard({ ...card, status: 'BLOCKED' });
      setShowBlockModal(false);
      setBlockPassword('');
      showToast(`Card ending in ${card.card_number?.slice(-4) || '****'} has been blocked successfully.`, 'success');
    } catch (error) {
      showToast('Verification failed. Please check your password.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleReportLost = () => { setBlockReason('lost'); setShowBlockModal(true); };
  const formatCardNumber = (cardNumber?: string) => cardNumber && cardNumber.length >= 4 ? `•••• •••• •••• ${cardNumber.slice(-4)}` : '•••• •••• •••• 4402';
  const formatDate = (dateStr: string) => { try { return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return dateStr; } };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div>
        <h2 className="text-3xl font-black tracking-tight">My Cards</h2>
        <p className="text-slate-500">Manage your physical and virtual cards, limits, and security.</p>
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">pin</span>Change Card PIN</h3>
            {pinError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm flex items-center gap-2"><span className="material-symbols-outlined text-sm">error</span>{pinError}</div>}
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Current PIN</label><input type="password" maxLength={4} value={pinData.current} onChange={(e) => setPinData({ ...pinData, current: e.target.value.replace(/\D/g, '') })} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest" placeholder="••••" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">New PIN</label><input type="password" maxLength={4} value={pinData.new} onChange={(e) => setPinData({ ...pinData, new: e.target.value.replace(/\D/g, '') })} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest" placeholder="••••" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Confirm New PIN</label><input type="password" maxLength={4} value={pinData.confirm} onChange={(e) => setPinData({ ...pinData, confirm: e.target.value.replace(/\D/g, '') })} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest" placeholder="••••" /></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowPinModal(false); setPinError(null); setPinData({ current: '', new: '', confirm: '' }); }} className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">Cancel</button>
              <button onClick={handleSetPin} className="flex-1 h-12 bg-primary text-white rounded-xl font-bold">Update PIN</button>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="text-center">
              <div className="size-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><span className="material-symbols-outlined text-3xl text-red-500">lock</span></div>
              <h3 className="text-xl font-bold">Block Card</h3>
              <p className="text-slate-500 mt-2">Are you sure you want to block your card ending in <span className="font-bold">{card?.card_number?.slice(-4) || '****'}</span>?</p>
              <p className="text-xs text-red-500 mt-2">This action cannot be undone instantly.</p>
            </div>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-400 uppercase">Reason for blocking</label><select value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-medium"><option value="lost">Lost Card</option><option value="stolen">Stolen Card</option><option value="damaged">Damaged Card</option><option value="suspicious">Suspicious Activity</option></select></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase">Enter Password to Confirm</label><input type="password" value={blockPassword} onChange={(e) => setBlockPassword(e.target.value)} className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4" placeholder="Enter your login password" /></div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => { setShowBlockModal(false); setBlockPassword(''); }} className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold">Cancel</button>
              <button onClick={handleBlockCard} className="flex-1 h-12 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined">block</span>Block Card</button>
            </div>
          </div>
        </div>
      )}

      {showStatementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center gap-2"><span className="material-symbols-outlined text-primary">description</span>Card Statement</h3>
              <button onClick={() => setShowStatementsModal(false)} className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {statementsLoading ? <div className="flex items-center justify-center py-12"><span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span></div> : statements.length === 0 ? <div className="text-center py-12"><span className="material-symbols-outlined text-6xl text-slate-300 mb-4">receipt_long</span><p className="text-slate-500">No transactions found</p></div> : (
                <div className="space-y-3">{statements.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600' : tx.type === 'TRANSFER' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}><span className="material-symbols-outlined text-sm">{tx.type === 'DEPOSIT' ? 'arrow_downward' : tx.type === 'TRANSFER' ? 'sync_alt' : 'arrow_upward'}</span></div>
                      <div><p className="font-bold text-sm">{tx.description || tx.type}</p><p className="text-xs text-slate-500">{formatDate(tx.date)}</p></div>
                    </div>
                    <div className="text-right"><p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toLocaleString()}</p><p className={`text-xs ${tx.status === 'COMPLETED' ? 'text-green-500' : 'text-yellow-500'}`}>{tx.status}</p></div>
                  </div>
                ))}</div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800"><button onClick={() => setShowStatementsModal(false)} className="w-full h-12 bg-primary text-white rounded-xl font-bold">Close</button></div>
          </div>
        </div>
      )}

      {/* Apply for Credit Card Modal */}
      {showApplyCreditCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6">
            <div className="text-center">
              <div className="size-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="material-symbols-outlined text-4xl text-white">credit_score</span>
              </div>
              <h3 className="text-2xl font-bold">Apply for Credit Card</h3>
              <p className="text-slate-500 mt-2">Get up to $10,000 credit limit with amazing rewards</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <span className="material-symbols-outlined text-amber-500 text-2xl mb-2">percent</span>
                <p className="text-xs text-slate-500">Interest Rate</p>
                <p className="font-bold">18.9% APR</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <span className="material-symbols-outlined text-amber-500 text-2xl mb-2">stars</span>
                <p className="text-xs text-slate-500">Rewards</p>
                <p className="font-bold">2x Points</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <span className="material-symbols-outlined text-amber-500 text-2xl mb-2">money_off</span>
                <p className="text-xs text-slate-500">Annual Fee</p>
                <p className="font-bold">$0 First Year</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <span className="material-symbols-outlined text-amber-500 text-2xl mb-2">security</span>
                <p className="text-xs text-slate-500">Protection</p>
                <p className="font-bold">Zero Liability</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <span className="font-bold">Eligibility:</span> Minimum 650 credit score, 3+ months account history, and stable income verification required.
              </p>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowApplyCreditCardModal(false)}
                className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                Maybe Later
              </button>
              <button 
                onClick={() => {
                  showToast('Credit card application submitted! We\'ll review and notify you within 24 hours.', 'success');
                  setShowApplyCreditCardModal(false);
                }}
                className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Type Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('DEBIT')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'DEBIT' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">credit_card</span>
            Debit Card
          </span>
        </button>
        <button
          onClick={() => setActiveTab('CREDIT')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
            activeTab === 'CREDIT' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">credit_score</span>
            Credit Card
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          {/* No Card Message for Credit Card Tab */}
          {activeTab === 'CREDIT' && !cards.find(c => c.card_type === 'CREDIT') ? (
            <div className="aspect-[1.58/1] rounded-3xl p-8 relative overflow-hidden shadow-2xl bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 flex flex-col items-center justify-center text-white">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-50">credit_card_off</span>
              <h3 className="text-xl font-bold mb-2">No Credit Card</h3>
              <p className="text-sm text-slate-300 text-center mb-6">Apply for a credit card to enjoy exclusive benefits and rewards</p>
              <button 
                onClick={() => setShowApplyCreditCardModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
              >
                <span className="material-symbols-outlined">add_card</span>
                Apply for Credit Card
              </button>
            </div>
          ) : (
            <>
              {/* Card Display */}
              <div className={`aspect-[1.58/1] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-500 ${
                localSettings.cardFrozen || card?.status === 'BLOCKED' 
                  ? 'grayscale opacity-60' 
                  : activeTab === 'CREDIT' 
                    ? 'bg-gradient-to-br from-amber-600 via-orange-500 to-red-500' 
                    : 'bg-gradient-to-br from-blue-700 via-primary to-indigo-900'
              }`}>
                {card?.status === 'BLOCKED' && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"><div className="text-center"><span className="material-symbols-outlined text-5xl text-red-400 mb-2">lock</span><p className="text-xl font-bold text-red-400">CARD BLOCKED</p></div></div>}
                {localSettings.cardFrozen && card?.status !== 'BLOCKED' && <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-20"><div className="text-center"><span className="material-symbols-outlined text-5xl text-blue-300 mb-2">ac_unit</span><p className="text-xl font-bold text-blue-300">FROZEN</p></div></div>}
                <div className="absolute top-0 right-0 p-8 opacity-20"><span className="material-symbols-outlined text-[80px]">{activeTab === 'CREDIT' ? 'credit_score' : 'credit_card'}</span></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${activeTab === 'CREDIT' ? 'bg-amber-500/30' : 'bg-white/20'}`}>
                      {activeTab === 'CREDIT' ? '💳 Credit' : '💰 Debit'}
                    </span>
                  </div>
                  <span className={`font-bold text-xs uppercase tracking-widest px-2 py-1 rounded ${card?.status === 'ACTIVE' ? 'bg-green-500/30 text-green-200' : card?.status === 'BLOCKED' ? 'bg-red-500/30 text-red-200' : 'bg-blue-500/30 text-blue-200'}`}>{card?.status || 'ACTIVE'} {card?.status === 'BLOCKED' ? '🔒' : card?.status === 'FROZEN' ? '❄️' : '✅'}</span>
                </div>
                <div className="mt-12 space-y-2 relative z-10"><div className="size-12 bg-yellow-400/90 rounded-lg shadow-inner mb-4"></div><p className="text-2xl font-mono font-black tracking-widest">{formatCardNumber(card?.card_number || card?.card_number_masked)}</p></div>
                <div className="mt-auto flex justify-between items-end relative z-10">
                  <div><p className="text-[10px] uppercase font-bold opacity-70">Card Holder</p><p className="font-bold tracking-tight">{(card?.card_holder_name || user.name).toUpperCase()}</p></div>
                  <div><p className="text-[10px] uppercase font-bold opacity-70">Expires</p><p className="font-bold">{card?.expiry_date || '12/26'}</p></div>
                  <img src={activeTab === 'CREDIT' ? 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' : 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg'} className="h-6 opacity-80" alt="Card Network" />
                </div>
              </div>

              {/* Credit Card Specific Info */}
              {activeTab === 'CREDIT' && card && (
                <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Credit Limit</span>
                    <span className="font-bold text-lg">${(card.credit_limit || 5000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Available Credit</span>
                    <span className="font-bold text-lg text-green-600">${(card.available_credit || 4500).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Current Balance</span>
                    <span className="font-bold text-lg text-amber-600">${(card.current_balance || 500).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-amber-500 rounded-full transition-all"
                      style={{ width: `${((card.current_balance || 500) / (card.credit_limit || 5000)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Min Payment: ${(card.minimum_payment || 25).toLocaleString()}</span>
                    <span>Due: {card.due_date || 15}th of month</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <span className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                      <span className="material-symbols-outlined text-sm">stars</span>
                      Rewards Points
                    </span>
                    <span className="font-bold text-amber-600">{(card.rewards_points || 1250).toLocaleString()} pts</span>
                  </div>
                </div>
              )}
            </>
          )}

          {card && card?.status !== 'BLOCKED' && !localSettings.cardFrozen && <button onClick={() => setShowBlockModal(true)} className="w-full h-14 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"><span className="material-symbols-outlined">block</span>Block Card 🚫</button>}
          
          {/* Card Summary Section */}
          {card && (
            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">info</span>
                Card Summary
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-blue-600">atm</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Max ATM Limit</span>
                  </div>
                  <span className="font-bold">$2,500/day</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-green-600">shopping_cart</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Max Online Purchase</span>
                  </div>
                  <span className="font-bold">$5,000/day</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-purple-600">point_of_sale</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Max POS Limit</span>
                  </div>
                  <span className="font-bold">$10,000/day</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3">
                    <div className="size-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-amber-600">account_balance</span>
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Linked Account</span>
                  </div>
                  <span className="font-bold font-mono text-sm">{user.accountNumber || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {[{ icon: 'pin', label: 'Set PIN', action: () => setShowPinModal(true), disabled: card?.status === 'BLOCKED' || !card }, { icon: 'report', label: 'Report Lost', action: handleReportLost, disabled: card?.status === 'BLOCKED' || !card }, { icon: 'restart_alt', label: 'Replace', action: () => showToast('Replacement request submitted!', 'success'), disabled: !card }, { icon: 'description', label: 'Statements', action: handleOpenStatements, disabled: !card }].map((btn, i) => (
              <button key={i} onClick={btn.action} disabled={btn.disabled} className={`p-4 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm font-bold flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all ${btn.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}><span className="material-symbols-outlined text-primary">{btn.icon}</span><span className="text-xs">{btn.label}</span></button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <div className="space-y-6">
              <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Daily Spending Limit</h3><span className="text-2xl font-black text-primary">${localSettings.dailyLimit}</span></div>
              <input type="range" min="500" max="10000" step="500" value={localSettings.dailyLimit} onChange={(e) => handleSettingChange('dailyLimit', parseInt(e.target.value))} className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary" disabled={updating || card?.status === 'BLOCKED'} />
              <div className="flex justify-between text-xs font-bold text-slate-400"><span>$500</span><span>$10,000</span></div>
            </div>
            <div className="h-px bg-slate-100 dark:bg-slate-800"></div>
            <div className="space-y-4">
              {[{ id: 'cardFrozen', icon: 'ac_unit', title: 'Freeze Card', desc: 'Temporarily block all transactions', active: localSettings.cardFrozen }, { id: 'intlUse', icon: 'public', title: 'International Use', desc: 'Allow transactions outside home country', active: localSettings.intlUse }, { id: 'onlinePayments', icon: 'shopping_cart', title: 'Online Payments', desc: 'Enable internet-based transactions', active: localSettings.onlinePayments }].map((opt) => (
                <div key={opt.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                  <div className="flex items-center gap-4"><div className={`size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm ${opt.id === 'cardFrozen' && opt.active ? 'text-blue-500' : 'text-primary'}`}><span className="material-symbols-outlined">{opt.icon}</span></div><div><p className="text-sm font-bold">{opt.title}</p><p className="text-xs text-slate-500">{opt.desc}</p></div></div>
                  <button onClick={() => handleSettingChange(opt.id, !opt.active)} disabled={updating || card?.status === 'BLOCKED'} className={`w-12 h-6 rounded-full p-1 transition-all ${opt.active ? (opt.id === 'cardFrozen' ? 'bg-blue-500' : 'bg-primary') : 'bg-slate-300 dark:bg-slate-700'} ${updating || card?.status === 'BLOCKED' ? 'opacity-50 cursor-not-allowed' : ''}`}><div className={`size-4 bg-white rounded-full transition-all ${opt.active ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
                </div>
              ))}
            </div>
            {card?.status === 'BLOCKED' && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"><div className="flex items-center gap-3"><span className="material-symbols-outlined text-red-500">info</span><div><p className="font-bold text-red-600">Card is Blocked</p><p className="text-sm text-red-500">Contact support to unblock your card or request a replacement.</p></div></div></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cards;