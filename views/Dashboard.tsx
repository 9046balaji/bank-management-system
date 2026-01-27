
import React, { useState, useEffect } from 'react';
import { UserState, View, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { analyticsApi, transactionApi } from '../src/services/api';

interface DashboardProps {
  user: UserState;
  setView: (v: View) => void;
}

interface ChartDataItem {
  name: string;
  value: number;
}

interface DashboardStats {
  monthlyIncome: number;
  monthlyExpense: number;
  totalSpending: number;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setView }) => {
  const [filterType, setFilterType] = useState<'ALL' | Transaction['type']>('ALL');
  const [sortOrder, setSortOrder] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMT_DESC' | 'AMT_ASC'>('DATE_DESC');
  const [chartData, setChartData] = useState<ChartDataItem[]>([
    { name: 'Transfers', value: 45000 },
    { name: 'Withdrawals', value: 12500 },
    { name: 'Expenses', value: 8320 },
  ]);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyIncome: 12500,
    monthlyExpense: 4800,
    totalSpending: 65800,
  });
  const [transactions, setTransactions] = useState<Transaction[]>(user.transactions);
  const [loading, setLoading] = useState(false);

  const COLORS = ['#135bec', '#10b981', '#f59e0b'];

  // Fetch dashboard data on mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user.id) return;
      
      setLoading(true);
      try {
        // Fetch expense categories for chart
        const categoriesResponse = await analyticsApi.getExpenseCategories(user.id);
        if (categoriesResponse.success && categoriesResponse.data) {
          const categories = categoriesResponse.data as any[];
          if (categories.length > 0) {
            setChartData(categories.map((c: any) => ({
              name: c.category || c.name,
              value: parseFloat(c.total) || c.value,
            })));
          }
        }

        // Fetch dashboard stats
        const statsResponse = await analyticsApi.getDashboardStats(user.id);
        if (statsResponse.success && statsResponse.data) {
          const data = statsResponse.data as any;
          setStats({
            monthlyIncome: parseFloat(data.monthly_income) || 12500,
            monthlyExpense: parseFloat(data.monthly_expense) || 4800,
            totalSpending: parseFloat(data.total_spending) || 65800,
          });
        }

        // If user has account, fetch recent transactions
        if (user.accountNumber) {
          // Find account ID from user data or use a placeholder
          // For now, use transactions from user state since they're already loaded
          setTransactions(user.transactions);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Keep default/existing data on error
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id, user.accountNumber]);

  // Update transactions when user.transactions changes
  useEffect(() => {
    setTransactions(user.transactions);
  }, [user.transactions]);

  const getFilteredTransactions = () => {
    let txs = [...transactions];

    if (filterType !== 'ALL') {
      txs = txs.filter(t => t.type === filterType);
    }

    txs.sort((a, b) => {
      switch (sortOrder) {
        case 'DATE_DESC': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'DATE_ASC': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'AMT_DESC': return b.amount - a.amount;
        case 'AMT_ASC': return a.amount - b.amount;
        default: return 0;
      }
    });

    return txs.slice(0, 5);
  };

  const visibleTransactions = getFilteredTransactions();

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
          <p className="text-slate-500 dark:text-slate-400">Here's what's happening with your accounts today.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setView(View.TRANSFERS)} className="px-4 py-2 bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">send</span> Transfer
           </button>
           <button onClick={() => setView(View.MANAGE_FUNDS)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all rounded-lg font-bold">
             Deposit
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Total Balance Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-100 mb-2">Total Available Balance</p>
          <h3 className="text-5xl font-black mb-8">${user.balance.toLocaleString()}</h3>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase mb-1">Monthly Income</p>
              <p className="text-xl font-bold">+${stats.monthlyIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase mb-1">Monthly Expense</p>
              <p className="text-xl font-bold">-${stats.monthlyExpense.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Monthly Spending Chart Card */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-4">Monthly Spending</h3>
          <div className="flex-1 h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  animationDuration={1000}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs font-bold text-slate-400">Total</span>
              <span className="text-xl font-black">${(chartData.reduce((sum, d) => sum + d.value, 0) / 1000).toFixed(1)}k</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
             {chartData.map((d, i) => (
               <div key={i} className="text-center">
                 <div className="size-2 rounded-full mx-auto mb-1" style={{backgroundColor: COLORS[i]}}></div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase">{d.name}</p>
                 <p className="text-xs font-bold">${(d.value/1000).toFixed(1)}k</p>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold whitespace-nowrap">Recent Transactions</h3>
            
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1.5 focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAWAL">Withdrawals</option>
                <option value="TRANSFER">Transfers</option>
              </select>

              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold px-3 py-1.5 focus:ring-1 focus:ring-primary"
              >
                <option value="DATE_DESC">Newest</option>
                <option value="DATE_ASC">Oldest</option>
                <option value="AMT_DESC">Amount (High)</option>
                <option value="AMT_ASC">Amount (Low)</option>
              </select>
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-50 dark:divide-slate-800 min-h-[300px]">
            {visibleTransactions.length > 0 ? (
              visibleTransactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-full flex items-center justify-center ${
                      tx.type === 'DEPOSIT' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      <span className="material-symbols-outlined text-xl">
                        {tx.type === 'DEPOSIT' ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{tx.description}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${tx.type === 'DEPOSIT' ? 'text-success' : ''}`}>
                      {tx.type === 'DEPOSIT' ? '+' : '-'}${tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-slate-400">{tx.status}</p>
                  </div>
                </div>
              ))
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                 <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                 <p className="text-sm font-bold">No transactions found</p>
               </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Cards */}
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
             {[
               { icon: 'payments', label: 'Transfers', color: 'bg-blue-500', view: View.TRANSFERS },
               { icon: 'account_balance', label: 'Deposits', color: 'bg-emerald-500', view: View.MANAGE_FUNDS },
               { icon: 'credit_card', label: 'My Cards', color: 'bg-indigo-500', view: View.MY_CARDS },
               { icon: 'real_estate_agent', label: 'Loan Center', color: 'bg-amber-500', view: View.LOANS }
             ].map((action, i) => (
               <button 
                key={i} 
                onClick={() => setView(action.view)}
                className="p-6 bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm text-left group hover:bg-primary hover:text-white transition-all duration-300 active:scale-95"
               >
                 <div className={`size-12 ${action.color} text-white rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                   <span className="material-symbols-outlined">{action.icon}</span>
                 </div>
                 <p className="font-bold">{action.label}</p>
                 <p className="text-xs text-slate-500 group-hover:text-blue-100">Quick Access</p>
               </button>
             ))}
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden h-40 flex items-center shadow-lg">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary opacity-20 rounded-full -mr-12 -mt-12 blur-3xl animate-blob"></div>
            <div className="relative z-10">
               <h4 className="text-xl font-bold mb-2">Upgrade to Premium</h4>
               <p className="text-sm text-slate-400 mb-4">Get lower interest rates and priority support.</p>
               <button className="px-4 py-2 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors active:scale-95">Learn More</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
