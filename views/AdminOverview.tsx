
import React from 'react';
import { UserState } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface AdminOverviewProps {
  user: UserState;
}

const AdminOverview: React.FC<AdminOverviewProps> = ({ user }) => {
  const depositData = [
    { day: 'Mon', total: 400 },
    { day: 'Tue', total: 700 },
    { day: 'Wed', total: 300 },
    { day: 'Thu', total: 900 },
    { day: 'Fri', total: 600 },
    { day: 'Sat', total: 200 },
    { day: 'Sun', total: 300 },
  ];

  const stats = [
    { label: 'Total Users', value: '12,450', grow: '+5%', icon: 'group' },
    { label: 'Total Deposits', value: '$45.2M', grow: '+12%', icon: 'account_balance' },
    { label: 'Active Loans', value: '320', grow: '+2%', icon: 'receipt_long' },
    { label: 'Pending Approvals', value: '15', grow: 'Action Required', icon: 'pending_actions', urgent: true },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Admin Overview</h2>
        <p className="text-slate-500">Sovereign Edition • System Health & Real-time Analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {stats.map((s, i) => (
           <div key={i} className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                 <div className="size-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined">{s.icon}</span>
                 </div>
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${s.urgent ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {s.grow}
                 </span>
              </div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                 <h3 className="text-2xl font-black">{s.value}</h3>
              </div>
           </div>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
         <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-xl font-bold">Deposit Trends</h3>
               <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1.5">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
               </select>
            </div>
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={depositData}>
                     <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#94a3b8'}} />
                     <YAxis hide />
                     <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                        {depositData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 3 ? '#135bec' : '#475569'} fillOpacity={index === 3 ? 1 : 0.6} />
                        ))}
                     </Bar>
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
               <h3 className="font-bold">System Activity</h3>
               <button className="text-xs font-bold text-primary">View All</button>
            </div>
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-800 overflow-y-auto">
               {[
                 { time: '10:42 AM', label: 'Large Deposit Verified', desc: 'Corp Acc #8821 verified.' },
                 { time: '09:15 AM', label: 'Loan Flagged', desc: 'Application #L-S92 risk discrepancy.' },
                 { time: 'Yesterday', label: 'System Backup', desc: 'Database success. Size: 4.2TB' },
                 { time: 'Yesterday', label: 'Failed Login', desc: 'Multiple attempts from unknown IP.' }
               ].map((feed, i) => (
                 <div key={i} className="px-6 py-4 space-y-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{feed.time}</p>
                    <p className="text-sm font-bold">{feed.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{feed.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminOverview;
