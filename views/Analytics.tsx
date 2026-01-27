
import React from 'react';
import { UserState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnalyticsProps {
  user: UserState;
}

const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
  const trendData = [
    { name: 'May', income: 4000, expense: 2400 },
    { name: 'Jun', income: 3000, expense: 1398 },
    { name: 'Jul', income: 2000, expense: 9800 },
    { name: 'Aug', income: 2780, expense: 3908 },
    { name: 'Sep', income: 1890, expense: 4800 },
    { name: 'Oct', income: 2390, expense: 3800 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Financial Analytics</h2>
          <p className="text-slate-500">Deep dive into your spending habits and income trends.</p>
        </div>
        <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold flex items-center gap-2">
          <span className="material-symbols-outlined">download</span> Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold mb-8">Income vs Expenses</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#135bec" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#135bec" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    itemStyle={{fontWeight: 800}}
                  />
                  <Area type="monotone" dataKey="income" stroke="#135bec" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" stroke="#f59e0b" strokeWidth={3} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-6 justify-center">
               <div className="flex items-center gap-2">
                 <div className="size-3 bg-primary rounded-full"></div>
                 <span className="text-sm font-bold">Income</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="size-3 bg-amber-500 rounded-full"></div>
                 <span className="text-sm font-bold">Expenses</span>
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-primary text-white p-8 rounded-3xl shadow-xl shadow-primary/20">
               <p className="text-xs font-bold uppercase tracking-widest text-blue-100 mb-2">Net Worth Growth</p>
               <h3 className="text-4xl font-black mb-1">+12.4%</h3>
               <p className="text-xs text-blue-200">Compared to last month</p>
               <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Assets</span>
                    <span className="font-bold">$284,500</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Liabilities</span>
                    <span className="font-bold text-blue-200">-$8,200</span>
                  </div>
               </div>
            </div>

            <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
               <h4 className="font-bold mb-4">Report Generation</h4>
               <p className="text-xs text-slate-500 mb-6">Download a detailed PDF statement for any date range.</p>
               <div className="space-y-3">
                 <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold" value="2023-10-01" readOnly />
                 <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-bold" value="2023-10-24" readOnly />
                 <button className="w-full h-12 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-sm">picture_as_pdf</span> Download PDF
                 </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Analytics;
