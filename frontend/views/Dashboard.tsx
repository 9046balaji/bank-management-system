
import React, { useState, useEffect } from 'react';
import { UserState, View, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { analyticsApi, transactionApi, cardApi } from '../src/services/api';
import { useSystemConfig } from '../src/contexts';

interface DashboardProps {
  user: UserState;
  setView: (v: View) => void;
}

interface FraudAlert {
  id: string;
  type: 'suspicious_transaction' | 'unusual_location' | 'multiple_attempts' | 'large_amount';
  title: string;
  description: string;
  amount?: number;
  location?: string;
  timestamp: Date;
  severity: 'high' | 'medium' | 'low';
  cardLast4?: string;
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

// Fraud Alert Banner Component
const FraudAlertBanner: React.FC<{
  alert: FraudAlert;
  onBlockCard: () => void;
  onDismiss: () => void;
  blocking: boolean;
}> = ({ alert, onBlockCard, onDismiss, blocking }) => {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'high': return 'from-red-600 to-red-700';
      case 'medium': return 'from-orange-500 to-orange-600';
      default: return 'from-yellow-500 to-yellow-600';
    }
  };

  const getIcon = () => {
    switch (alert.type) {
      case 'suspicious_transaction': return 'warning';
      case 'unusual_location': return 'location_off';
      case 'multiple_attempts': return 'sync_problem';
      case 'large_amount': return 'payments';
      default: return 'security';
    }
  };

  return (
    <div className={`bg-gradient-to-r ${getSeverityColor()} rounded-2xl p-6 text-white shadow-xl animate-pulse-slow relative overflow-hidden`}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white rounded-full animate-ping"></div>
        <div className="absolute bottom-2 left-1/4 w-16 h-16 bg-white rounded-full animate-pulse"></div>
      </div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 animate-bounce">
            <span className="material-symbols-outlined text-3xl">{getIcon()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wider">
                🚨 {alert.severity} Priority
              </span>
              <span className="text-xs opacity-75">
                {alert.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <h3 className="text-xl font-black mb-1">{alert.title}</h3>
            <p className="text-white/90 text-sm">{alert.description}</p>
            {alert.amount && (
              <p className="mt-2 font-bold">
                Amount: <span className="text-2xl">${alert.amount.toLocaleString()}</span>
                {alert.cardLast4 && <span className="ml-2 opacity-75">• Card ending in {alert.cardLast4}</span>}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={onDismiss}
            className="flex-1 md:flex-none px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Dismiss
          </button>
          <button
            onClick={onBlockCard}
            disabled={blocking}
            className="flex-1 md:flex-none px-6 py-3 bg-white text-red-600 hover:bg-red-50 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {blocking ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                Blocking...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">block</span>
                Block Card Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast notification component
const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
  const icon = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';

  return (
    <div className={`fixed top-4 right-4 z-[100] ${bgColor} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in`}>
      <span className="material-symbols-outlined">{icon}</span>
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ user, setView }) => {
  const { formatCurrency, currencySymbol } = useSystemConfig();
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
  
  // Fraud Alert State
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [blockingCard, setBlockingCard] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  // Fraud detection disabled - removed demo alert
  // The fraud alerts state and handlers are kept for potential real implementation

  // Handle block card from fraud alert
  const handleBlockCardFromAlert = async (alertId: string) => {
    // Check if user has any cards to block
    if (!user.cards?.length) {
      setToast({
        message: 'No card linked to your account. Please add a card first.',
        type: 'error'
      });
      // Remove the alert since there's no card to block
      setFraudAlerts(prev => prev.filter(a => a.id !== alertId));
      return;
    }

    setBlockingCard(true);
    try {
      // Get user's primary card
      const cardId = user.cards[0].id;
      await cardApi.reportLost(cardId, 'suspicious_activity');
      
      // Remove the alert
      setFraudAlerts(prev => prev.filter(a => a.id !== alertId));
      setToast({
        message: '✅ Card has been blocked successfully! A new card will be issued.',
        type: 'success'
      });
    } catch (error) {
      setToast({
        message: 'Failed to block card. Please try again or contact support.',
        type: 'error'
      });
    } finally {
      setBlockingCard(false);
    }
  };

  // Handle dismiss fraud alert
  const handleDismissAlert = (alertId: string) => {
    setFraudAlerts(prev => prev.filter(a => a.id !== alertId));
    setToast({
      message: 'Alert dismissed. We\'ll continue monitoring your account.',
      type: 'info'
    });
  };

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
      {/* Toast Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Fraud Alert Banners */}
      {fraudAlerts.length > 0 && (
        <div className="space-y-4">
          {fraudAlerts.map(alert => (
            <FraudAlertBanner
              key={alert.id}
              alert={alert}
              onBlockCard={() => handleBlockCardFromAlert(alert.id)}
              onDismiss={() => handleDismissAlert(alert.id)}
              blocking={blockingCard}
            />
          ))}
        </div>
      )}

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

      {/* Account Details Section */}
      <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">account_balance</span>
          Account Details
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Holder</p>
            <p className="text-lg font-bold">{user.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Account Number</p>
            <p className="text-lg font-bold font-mono">{user.accountNumber || 'N/A'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Available Balance</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(user.balance)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Loan</p>
            <p className="text-lg font-bold text-amber-600">
              {user.loans && user.loans.length > 0 
                ? formatCurrency(user.loans.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.amount, 0))
                : 'No Active Loans'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Total Balance Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/30 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-blue-100 mb-2">Total Available Balance</p>
          <h3 className="text-5xl font-black mb-8">{formatCurrency(user.balance)}</h3>
          <div className="flex gap-8">
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase mb-1">Monthly Income</p>
              <p className="text-xl font-bold">+{formatCurrency(stats.monthlyIncome)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-blue-200 uppercase mb-1">Monthly Expense</p>
              <p className="text-xl font-bold">-{formatCurrency(stats.monthlyExpense)}</p>
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
              <span className="text-xl font-black">{currencySymbol}{(chartData.reduce((sum, d) => sum + d.value, 0) / 1000).toFixed(1)}k</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
             {chartData.map((d, i) => (
               <div key={i} className="text-center">
                 <div className="size-2 rounded-full mx-auto mb-1" style={{backgroundColor: COLORS[i]}}></div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase">{d.name}</p>
                 <p className="text-xs font-bold">{currencySymbol}{(d.value/1000).toFixed(1)}k</p>
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
                      {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(tx.amount)}
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
