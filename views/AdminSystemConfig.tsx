
import React from 'react';
import { UserState } from '../types';

interface AdminSystemConfigProps {
  user: UserState;
  onUpdate: (settings: Partial<UserState['settings']>) => void;
}

const AdminSystemConfig: React.FC<AdminSystemConfigProps> = ({ user, onUpdate }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight">System Configuration</h2>
        <p className="text-slate-500">Manage global bank parameters and operational status.</p>
      </div>

      <div className="space-y-8">
         <section className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">settings_power</span> Operational Status
               </h3>
            </div>
            <div className="p-8">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl">
                  <div className="space-y-1 max-w-lg">
                     <p className="font-bold text-slate-900 dark:text-white">System Maintenance Mode</p>
                     <p className="text-sm text-slate-500 leading-relaxed">
                        Pause all customer transactions and put the core banking engine into maintenance. Users will be unable to transfer or login.
                     </p>
                  </div>
                  <button 
                    onClick={() => onUpdate({ maintenanceMode: !user.settings.maintenanceMode })}
                    className={`w-14 h-7 rounded-full p-1 transition-all ${user.settings.maintenanceMode ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`size-5 bg-white rounded-full transition-all ${user.settings.maintenanceMode ? 'translate-x-7' : 'translate-x-0'}`}></div>
                  </button>
               </div>
            </div>
         </section>

         <section className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
               <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">currency_exchange</span> Financial Parameters
               </h3>
            </div>
            <div className="p-8 space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Currency</label>
                     <select className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 font-bold focus:ring-2 focus:ring-primary">
                        <option>USD - United States Dollar</option>
                        <option>EUR - Euro</option>
                        <option>GBP - British Pound</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Savings Int. Rate (%)</label>
                     <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400">percent</span>
                        <input 
                           type="number" step="0.1" 
                           className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-bold focus:ring-2 focus:ring-primary" 
                           value={user.settings.savingsRate}
                           onChange={(e) => onUpdate({ savingsRate: parseFloat(e.target.value) })}
                        />
                     </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse md:flex-row justify-between items-center gap-4">
                  <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                     <span className="material-symbols-outlined text-[14px]">history</span> Last updated by ADMIN_SECURE on Oct 24, 2023
                  </p>
                  <div className="flex gap-4 w-full md:w-auto">
                     <button className="flex-1 md:flex-none px-6 h-12 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm">Discard</button>
                     <button className="flex-[2] md:flex-none px-8 h-12 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-sm">save</span> Save Global Config
                     </button>
                  </div>
               </div>
            </div>
         </section>
      </div>
    </div>
  );
};

export default AdminSystemConfig;
