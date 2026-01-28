
import React from 'react';
import { View, UserRole } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (v: View) => void;
  role: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, role }) => {
  const menuItems = role === UserRole.USER ? [
    { id: View.DASHBOARD, label: 'Dashboard', icon: 'space_dashboard' },
    { id: View.TRANSFERS, label: 'Transfers', icon: 'sync_alt' },
    { id: View.MY_CARDS, label: 'My Cards', icon: 'credit_card' },
    { id: View.MANAGE_FUNDS, label: 'Manage Funds', icon: 'payments' },
    { id: View.LOANS, label: 'Loans', icon: 'real_estate_agent' },
    { id: View.ANALYTICS, label: 'Analytics', icon: 'bar_chart' },
    { id: View.SUPPORT, label: 'Support', icon: 'support_agent' },
    { id: View.PROFILE, label: 'Profile', icon: 'person' },
  ] : [
    { id: View.ADMIN_OVERVIEW, label: 'Overview', icon: 'analytics' },
    { id: View.ADMIN_LOANS, label: 'Loan Approvals', icon: 'approval_delegation' },
    { id: View.ADMIN_CARDS, label: 'Card Approvals', icon: 'credit_card' },
    { id: View.ADMIN_PAYMENTS, label: 'Payment Tracking', icon: 'account_balance' },
    { id: View.ADMIN_FEEDBACK, label: 'Feedback', icon: 'feedback' },
    { id: View.ADMIN_CHAT, label: 'AI Assistant', icon: 'smart_toy' },
    { id: View.ADMIN_CONFIG, label: 'System Config', icon: 'settings' },
  ];

  return (
    <aside className="w-full md:w-64 bg-surface-light dark:bg-surface-dark border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-2xl">account_balance</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Aura Bank</h1>
          <p className="text-[10px] uppercase tracking-widest font-black text-primary opacity-80">
            {role === UserRole.ADMIN ? 'Administrator' : 'Digital Suite'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 active:scale-95 ${
              currentView === item.id 
              ? 'bg-primary text-white shadow-md shadow-primary/20' 
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-center">
         <p className="text-[10px] text-slate-400 font-bold uppercase">v2.4.0 Secure Build</p>
      </div>
    </aside>
  );
};

export default Sidebar;
