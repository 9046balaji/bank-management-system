
import React from 'react';
import { UserState } from '../types';

interface CardsProps {
  user: UserState;
  onUpdate: (settings: Partial<UserState['settings']>) => void;
}

const Cards: React.FC<CardsProps> = ({ user, onUpdate }) => {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight">My Cards</h2>
        <p className="text-slate-500">Manage your physical and virtual cards, limits, and security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-8">
          {/* Card Visual */}
          <div className={`aspect-[1.58/1] rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-500 ${user.settings.cardFrozen ? 'grayscale opacity-60' : 'bg-gradient-to-br from-blue-700 via-primary to-indigo-900'}`}>
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <span className="material-symbols-outlined text-[80px]">credit_score</span>
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-2">
                 <div className="size-8 bg-white/20 rounded-full"></div>
                 <div className="size-8 bg-white/20 rounded-full -ml-4"></div>
              </div>
              <span className="font-bold text-xs uppercase tracking-widest bg-white/20 px-2 py-1 rounded">DEBIT</span>
            </div>

            <div className="mt-12 space-y-2 relative z-10">
               <div className="size-12 bg-yellow-400/90 rounded-lg shadow-inner mb-4"></div>
               <p className="text-2xl font-mono font-black tracking-widest">•••• •••• •••• 4402</p>
            </div>

            <div className="mt-auto flex justify-between items-end relative z-10">
               <div>
                 <p className="text-[10px] uppercase font-bold text-blue-200">Card Holder</p>
                 <p className="font-bold tracking-tight">{user.name.toUpperCase()}</p>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-blue-200">Expires</p>
                 <p className="font-bold">12/26</p>
               </div>
               <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6 opacity-80" alt="Visa" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
               { icon: 'pin', label: 'Set PIN' },
               { icon: 'report', label: 'Report Lost' },
               { icon: 'restart_alt', label: 'Replace' },
               { icon: 'description', label: 'Statements' }
             ].map((btn, i) => (
               <button key={i} className="p-4 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm font-bold flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
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
                  <span className="text-2xl font-black text-primary">${user.settings.dailyLimit}</span>
                </div>
                <input 
                  type="range" 
                  min="500" 
                  max="10000" 
                  step="500"
                  value={user.settings.dailyLimit}
                  onChange={(e) => onUpdate({ dailyLimit: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>$500</span>
                  <span>$10,000</span>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800"></div>

              <div className="space-y-4">
                 {[
                   { id: 'cardFrozen', icon: 'lock', title: 'Freeze Card', desc: 'Temporarily block all transactions', active: user.settings.cardFrozen },
                   { id: 'intlUse', icon: 'public', title: 'International Use', desc: 'Allow transactions outside home country', active: user.settings.intlUse },
                   { id: 'onlinePayments', icon: 'shopping_cart', title: 'Online Payments', desc: 'Enable internet-based transactions', active: user.settings.onlinePayments }
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
                        onClick={() => onUpdate({ [opt.id]: !opt.active })}
                        className={`w-12 h-6 rounded-full p-1 transition-all ${opt.active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
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
