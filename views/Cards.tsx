
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { cardApi } from '../src/services/api';

interface CardsProps {
  user: UserState;
  onUpdate: (settings: Partial<UserState['settings']>) => void;
}

interface CardData {
  id: string;
  card_number: string;
  card_holder_name: string;
  expiry_date: string;
  card_type: string;
  status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
  daily_limit: number;
  is_international_enabled: boolean;
  is_online_enabled: boolean;
}

const Cards: React.FC<CardsProps> = ({ user, onUpdate }) => {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinData, setPinData] = useState({ current: '', new: '', confirm: '' });
  const [pinError, setPinError] = useState<string | null>(null);

  // Local state synced with card data
  const [localSettings, setLocalSettings] = useState({
    cardFrozen: user.settings.cardFrozen,
    intlUse: user.settings.intlUse,
    onlinePayments: user.settings.onlinePayments,
    dailyLimit: user.settings.dailyLimit,
  });

  // Fetch card data on mount
  useEffect(() => {
    const fetchCard = async () => {
      if (!user.id) return;
      setLoading(true);
      try {
        // For demo, try to get cards by account - in production, use actual account ID
        const response = await cardApi.getAll();
        if (response.success && response.data) {
          const cards = response.data as CardData[];
          if (cards.length > 0) {
            const userCard = cards[0]; // Get first card
            setCard(userCard);
            setLocalSettings({
              cardFrozen: userCard.status === 'FROZEN',
              intlUse: userCard.is_international_enabled,
              onlinePayments: userCard.is_online_enabled,
              dailyLimit: userCard.daily_limit,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching cards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [user.id]);

  const handleSettingChange = async (key: string, value: boolean | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    onUpdate({ [key]: value });

    // Update card via API if we have a card
    if (card) {
      setUpdating(true);
      try {
        let apiUpdate: any = {};
        if (key === 'cardFrozen') {
          apiUpdate = { status: value ? 'FROZEN' : 'ACTIVE' };
        } else if (key === 'intlUse') {
          apiUpdate = { is_international_enabled: value };
        } else if (key === 'onlinePayments') {
          apiUpdate = { is_online_enabled: value };
        } else if (key === 'dailyLimit') {
          apiUpdate = { daily_limit: value };
        }

        await cardApi.update(card.id, apiUpdate);
      } catch (error) {
        console.error('Error updating card:', error);
        // Revert on error
        setLocalSettings(prev => ({ ...prev, [key]: !value }));
        onUpdate({ [key]: !value });
      } finally {
        setUpdating(false);
      }
    }
  };

  const handleSetPin = async () => {
    if (pinData.new !== pinData.confirm) {
      setPinError('New PINs do not match');
      return;
    }
    if (pinData.new.length !== 4) {
      setPinError('PIN must be 4 digits');
      return;
    }

    if (card) {
      try {
        const response = await cardApi.updatePin(card.id, pinData.current, pinData.new);
        if (response.success) {
          setShowPinModal(false);
          setPinData({ current: '', new: '', confirm: '' });
          setPinError(null);
          alert('PIN updated successfully!');
        } else {
          setPinError(response.error || 'Failed to update PIN');
        }
      } catch (error) {
        setPinError('Failed to update PIN');
      }
    }
  };

  const handleReportLost = async () => {
    if (card && confirm('Are you sure you want to report this card as lost? It will be blocked immediately.')) {
      try {
        await cardApi.reportLost(card.id, 'Reported lost by user');
        setCard({ ...card, status: 'BLOCKED' });
        alert('Card has been blocked. A replacement will be sent to you.');
      } catch (error) {
        console.error('Error reporting card:', error);
      }
    }
  };

  // Format card number for display
  const formatCardNumber = (cardNumber?: string) => {
    if (cardNumber && cardNumber.length >= 4) {
      return `•••• •••• •••• ${cardNumber.slice(-4)}`;
    }
    return '•••• •••• •••• 4402';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight">My Cards</h2>
        <p className="text-slate-500">Manage your physical and virtual cards, limits, and security.</p>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <h3 className="text-xl font-bold">Change Card PIN</h3>
            {pinError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 text-sm">
                {pinError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Current PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinData.current}
                  onChange={(e) => setPinData({ ...pinData, current: e.target.value })}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinData.new}
                  onChange={(e) => setPinData({ ...pinData, new: e.target.value })}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={pinData.confirm}
                  onChange={(e) => setPinData({ ...pinData, confirm: e.target.value })}
                  className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-mono text-center text-2xl tracking-widest"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => { setShowPinModal(false); setPinError(null); }}
                className="flex-1 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPin}
                className="flex-1 h-12 bg-primary text-white rounded-xl font-bold"
              >
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          {/* Card Visual */}
          <div className={`aspect-[1.58/1] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-500 ${localSettings.cardFrozen || card?.status === 'BLOCKED' ? 'grayscale opacity-60' : 'bg-gradient-to-br from-blue-700 via-primary to-indigo-900'}`}>
            {card?.status === 'BLOCKED' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                <span className="text-xl font-bold text-red-400">CARD BLOCKED</span>
              </div>
            )}
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <span className="material-symbols-outlined text-[80px]">credit_score</span>
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                 <div className="size-8 bg-white/20 rounded-full"></div>
                 <div className="size-8 bg-white/20 rounded-full -ml-4"></div>
              </div>
              <span className="font-bold text-xs uppercase tracking-widest bg-white/20 px-2 py-1 rounded">{card?.card_type || 'DEBIT'}</span>
            </div>

            <div className="mt-12 space-y-2 relative z-10">
               <div className="size-12 bg-yellow-400/90 rounded-lg shadow-inner mb-4"></div>
               <p className="text-2xl font-mono font-black tracking-widest">{formatCardNumber(card?.card_number)}</p>
            </div>

            <div className="mt-auto flex justify-between items-end relative z-10">
               <div>
                 <p className="text-[10px] uppercase font-bold text-blue-200">Card Holder</p>
                 <p className="font-bold tracking-tight">{(card?.card_holder_name || user.name).toUpperCase()}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-blue-200">Expires</p>
                 <p className="font-bold">{card?.expiry_date || '12/26'}</p>
               </div>
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6 opacity-80" alt="Visa" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
               { icon: 'pin', label: 'Set PIN', action: () => setShowPinModal(true) },
               { icon: 'report', label: 'Report Lost', action: handleReportLost },
               { icon: 'restart_alt', label: 'Replace', action: () => alert('Replacement request submitted') },
               { icon: 'description', label: 'Statements', action: () => alert('Statements feature coming soon') }
             ].map((btn, i) => (
               <button 
                 key={i} 
                 onClick={btn.action}
                 className="p-4 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm font-bold flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
               >
                 <span className="material-symbols-outlined text-primary">{btn.icon}</span>
                 <span className="text-xs">{btn.label}</span>
               </button>
             ))}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
           <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Daily Spending Limit</h3>
                  <span className="text-2xl font-black text-primary">${localSettings.dailyLimit}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="10000" 
                  step="500"
                  value={localSettings.dailyLimit}
                  onChange={(e) => handleSettingChange('dailyLimit', parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                  disabled={updating}
                />
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-4">
                 {[
                   { id: 'cardFrozen', icon: 'lock', title: 'Freeze Card', desc: 'Temporarily block all transactions', active: localSettings.cardFrozen },
                   { id: 'intlUse', icon: 'public', title: 'International Use', desc: 'Allow transactions outside home country', active: localSettings.intlUse },
                   { id: 'onlinePayments', icon: 'shopping_cart', title: 'Online Payments', desc: 'Enable internet-based transactions', active: localSettings.onlinePayments }
                 ].map((opt) => (
                   <div key={opt.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl">
                     <div className="flex items-center gap-4">
                        <div className="size-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary shadow-sm">
                           <span className="material-symbols-outlined">{opt.icon}</span>
                        </div>
                        <div>
                           <p className="text-sm font-bold">{opt.title}</p>
                           <p className="text-xs text-slate-500">{opt.desc}</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleSettingChange(opt.id, !opt.active)}
                        disabled={updating}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${opt.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'} ${updating ? 'opacity-50' : ''}`}
                      >
                        <div className={`size-4 bg-white rounded-full transition-all ${opt.active ? 'translate-x-6' : 'translate-x-0'}`}></div>
                     </button>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Cards;
