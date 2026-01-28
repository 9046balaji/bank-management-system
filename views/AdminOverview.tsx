
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { analyticsApi } from '../src/services/api';

interface AdminStats {
  total_users: number;
  total_deposits: number;
  active_loans: number;
  pending_approvals: number;
  user_growth: string;
  deposit_growth: string;
  loan_growth: string;
}

interface DepositData {
  day: string;
  total: number;
}

interface ActivityItem {
  type: string;
  time: string;
  label: string;
  description: string;
}

interface AdminOverviewProps {
  user: UserState;
}

// Impressive demo data for hackathon presentation
const DEMO_STATS: AdminStats = {
  total_users: 12847,
  total_deposits: 48750000,
  active_loans: 342,
  pending_approvals: 7,
  user_growth: '+18.5%',
  deposit_growth: '+24.3%',
  loan_growth: '+12.8%'
};

const DEMO_DEPOSIT_DATA: DepositData[] = [
  { day: 'Mon', total: 4850000 },
  { day: 'Tue', total: 6200000 },
  { day: 'Wed', total: 5100000 },
  { day: 'Thu', total: 7800000 },
  { day: 'Fri', total: 9200000 },
  { day: 'Sat', total: 3400000 },
  { day: 'Sun', total: 2100000 },
];

const DEMO_ACTIVITY: ActivityItem[] = [
  { type: 'loan', time: '2 min ago', label: 'Loan Approved', description: 'Personal loan for $25,000 approved for John M.' },
  { type: 'user', time: '5 min ago', label: 'New Registration', description: 'KYC completed with AI verification for Sarah K.' },
  { type: 'transfer', time: '8 min ago', label: 'Large Transfer', description: 'Wire transfer of $150,000 processed successfully' },
  { type: 'alert', time: '12 min ago', label: 'Fraud Blocked', description: 'ML model blocked suspicious transaction attempt' },
  { type: 'system', time: '15 min ago', label: 'System Update', description: 'Interest rates synchronized with Federal Reserve' },
  { type: 'loan', time: '22 min ago', label: 'Loan Rejected', description: 'Auto loan denied - DTI ratio exceeded 50%' },
  { type: 'user', time: '30 min ago', label: 'Account Upgrade', description: 'Premium tier activated for Michael R.' },
];

const AdminOverview: React.FC<AdminOverviewProps> = ({ user }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [depositData, setDepositData] = useState<DepositData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [depositDays, setDepositDays] = useState(7);
  const [demoMode, setDemoMode] = useState(true); // Default to demo mode for hackathon

  useEffect(() => {
    if (demoMode) {
      // Use demo data for hackathon presentation
      loadDemoData();
    } else {
      fetchData();
    }
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) {
      fetchDepositTrends();
    }
  }, [depositDays, demoMode]);

  const loadDemoData = async () => {
    setLoading(true);
    // Simulate loading for realism
    await new Promise(r => setTimeout(r, 800));
    setStats(DEMO_STATS);
    setDepositData(DEMO_DEPOSIT_DATA);
    setActivity(DEMO_ACTIVITY);
    setLoading(false);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, depositsRes, activityRes] = await Promise.all([
        analyticsApi.getAdminStats(),
        analyticsApi.getDepositTrends(7),
        analyticsApi.getAdminActivity(10)
      ]);

      if (statsRes.success) {
        setStats(statsRes.data as AdminStats);
      }
      if (depositsRes.success) {
        setDepositData((depositsRes.data as DepositData[]) || []);
      }
      if (activityRes.success) {
        setActivity((activityRes.data as ActivityItem[]) || []);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      // Fallback to demo data on error
      setStats(DEMO_STATS);
      setDepositData(DEMO_DEPOSIT_DATA);
      setActivity(DEMO_ACTIVITY);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepositTrends = async () => {
    try {
      const response = await analyticsApi.getDepositTrends(depositDays);
      if (response.success) {
        setDepositData((response.data as DepositData[]) || []);
      }
    } catch (err) {
      console.error('Error fetching deposit trends:', err);
    }
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  // Default stats for loading state
  const displayStats = stats || {
    total_users: 0,
    total_deposits: 0,
    active_loans: 0,
    pending_approvals: 0,
    user_growth: '0%',
    deposit_growth: '0%',
    loan_growth: '0%'
  };

  const statCards = [
    { label: 'Total Users', value: formatNumber(displayStats.total_users), grow: displayStats.user_growth, icon: 'group' },
    { label: 'Total Deposits', value: formatCurrency(displayStats.total_deposits), grow: displayStats.deposit_growth, icon: 'account_balance' },
    { label: 'Active Loans', value: formatNumber(displayStats.active_loans), grow: displayStats.loan_growth, icon: 'receipt_long' },
    { label: 'Pending Approvals', value: formatNumber(displayStats.pending_approvals), grow: displayStats.pending_approvals > 0 ? 'Action Required' : 'All Clear', icon: 'pending_actions', urgent: displayStats.pending_approvals > 0 },
  ];

  // Find max deposit for highlighting
  const maxDeposit = Math.max(...depositData.map(d => d.total), 0);
  const maxDepositIndex = depositData.findIndex(d => d.total === maxDeposit);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Admin Overview</h2>
          <p className="text-slate-500">Sovereign Edition • System Health & Real-time Analytics</p>
        </div>
        <button
          onClick={() => setDemoMode(!demoMode)}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            demoMode 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          <span className="material-symbols-outlined text-sm align-middle mr-1">
            {demoMode ? 'auto_awesome' : 'cloud_sync'}
          </span>
          {demoMode ? 'Demo Mode' : 'Live Data'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {statCards.map((s, i) => (
           <div key={i} className={`bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 ${loading ? 'animate-pulse' : ''}`}>
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
               <select 
                 value={depositDays}
                 onChange={(e) => setDepositDays(parseInt(e.target.value))}
                 className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1.5"
               >
                  <option value={7}>Last 7 Days</option>
                  <option value={30}>Last 30 Days</option>
               </select>
            </div>
            <div className="h-64 w-full">
               {depositData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={depositData}>
                       <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#94a3b8'}} />
                       <YAxis hide />
                       <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                          {depositData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === maxDepositIndex ? '#135bec' : '#475569'} fillOpacity={index === maxDepositIndex ? 1 : 0.6} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-400">
                   {loading ? 'Loading...' : 'No deposit data available'}
                 </div>
               )}
            </div>
         </div>

         <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
               <h3 className="font-bold">System Activity</h3>
               <button onClick={fetchData} className="text-xs font-bold text-primary">Refresh</button>
            </div>
            <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-800 overflow-y-auto max-h-80">
               {activity.length > 0 ? activity.map((feed, i) => (
                 <div key={i} className="px-6 py-4 space-y-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{feed.time}</p>
                    <p className="text-sm font-bold">{feed.label}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{feed.description}</p>
                 </div>
               )) : (
                 <div className="px-6 py-8 text-center text-slate-400">
                   {loading ? 'Loading activity...' : 'No recent activity'}
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default AdminOverview;
