
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { useSystemConfig } from '../src/contexts';

// @ts-ignore - Vite provides import.meta.env
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000/api';

interface PaymentRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: 'LOAN_PAYMENT' | 'LOAN_INTEREST' | 'CREDIT_CARD_BILL' | 'CREDIT_CARD_INTEREST';
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIALLY_PAID';
  reference_id: string; // Loan ID or Card ID
  reference_name: string; // Loan type or Card last 4
}

interface UserPaymentSummary {
  user_id: string;
  user_name: string;
  user_email: string;
  avatar: string;
  total_loans: number;
  active_loans: number;
  total_loan_amount: number;
  loan_payments_made: number;
  loan_payments_pending: number;
  loan_payments_overdue: number;
  credit_cards: number;
  credit_card_balance: number;
  credit_card_payments_made: number;
  credit_card_payments_overdue: number;
  payment_health_score: number; // 0-100
}

interface AdminPaymentTrackingProps {
  user: UserState;
}

// Demo data
const DEMO_USER_SUMMARIES: UserPaymentSummary[] = [
  {
    user_id: 'u1',
    user_name: 'Rajesh Kumar',
    user_email: 'rajesh@email.com',
    avatar: 'https://ui-avatars.com/api/?name=Rajesh+Kumar&background=135bec&color=fff',
    total_loans: 2,
    active_loans: 1,
    total_loan_amount: 500000,
    loan_payments_made: 8,
    loan_payments_pending: 1,
    loan_payments_overdue: 0,
    credit_cards: 1,
    credit_card_balance: 15000,
    credit_card_payments_made: 6,
    credit_card_payments_overdue: 0,
    payment_health_score: 95,
  },
  {
    user_id: 'u2',
    user_name: 'Priya Sharma',
    user_email: 'priya@email.com',
    avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=10b981&color=fff',
    total_loans: 1,
    active_loans: 1,
    total_loan_amount: 300000,
    loan_payments_made: 4,
    loan_payments_pending: 1,
    loan_payments_overdue: 1,
    credit_cards: 2,
    credit_card_balance: 45000,
    credit_card_payments_made: 5,
    credit_card_payments_overdue: 1,
    payment_health_score: 72,
  },
  {
    user_id: 'u3',
    user_name: 'Amit Patel',
    user_email: 'amit@email.com',
    avatar: 'https://ui-avatars.com/api/?name=Amit+Patel&background=f59e0b&color=fff',
    total_loans: 3,
    active_loans: 2,
    total_loan_amount: 1200000,
    loan_payments_made: 12,
    loan_payments_pending: 2,
    loan_payments_overdue: 3,
    credit_cards: 1,
    credit_card_balance: 85000,
    credit_card_payments_made: 3,
    credit_card_payments_overdue: 2,
    payment_health_score: 45,
  },
  {
    user_id: 'u4',
    user_name: 'Sunita Reddy',
    user_email: 'sunita@email.com',
    avatar: 'https://ui-avatars.com/api/?name=Sunita+Reddy&background=6366f1&color=fff',
    total_loans: 1,
    active_loans: 0,
    total_loan_amount: 200000,
    loan_payments_made: 24,
    loan_payments_pending: 0,
    loan_payments_overdue: 0,
    credit_cards: 1,
    credit_card_balance: 0,
    credit_card_payments_made: 12,
    credit_card_payments_overdue: 0,
    payment_health_score: 100,
  },
  {
    user_id: 'u5',
    user_name: 'Vikram Singh',
    user_email: 'vikram@email.com',
    avatar: 'https://ui-avatars.com/api/?name=Vikram+Singh&background=ef4444&color=fff',
    total_loans: 2,
    active_loans: 2,
    total_loan_amount: 800000,
    loan_payments_made: 2,
    loan_payments_pending: 1,
    loan_payments_overdue: 5,
    credit_cards: 2,
    credit_card_balance: 120000,
    credit_card_payments_made: 1,
    credit_card_payments_overdue: 4,
    payment_health_score: 22,
  },
];

const DEMO_PAYMENT_RECORDS: PaymentRecord[] = [
  {
    id: 'p1',
    user_id: 'u3',
    user_name: 'Amit Patel',
    user_email: 'amit@email.com',
    type: 'LOAN_PAYMENT',
    amount: 25000,
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null,
    status: 'OVERDUE',
    reference_id: 'loan-1',
    reference_name: 'Personal Loan',
  },
  {
    id: 'p2',
    user_id: 'u5',
    user_name: 'Vikram Singh',
    user_email: 'vikram@email.com',
    type: 'CREDIT_CARD_BILL',
    amount: 45000,
    due_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null,
    status: 'OVERDUE',
    reference_id: 'card-1',
    reference_name: '****4521',
  },
  {
    id: 'p3',
    user_id: 'u2',
    user_name: 'Priya Sharma',
    user_email: 'priya@email.com',
    type: 'LOAN_INTEREST',
    amount: 8500,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null,
    status: 'PENDING',
    reference_id: 'loan-2',
    reference_name: 'Home Loan',
  },
  {
    id: 'p4',
    user_id: 'u1',
    user_name: 'Rajesh Kumar',
    user_email: 'rajesh@email.com',
    type: 'LOAN_PAYMENT',
    amount: 15000,
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'PAID',
    reference_id: 'loan-3',
    reference_name: 'Car Loan',
  },
  {
    id: 'p5',
    user_id: 'u5',
    user_name: 'Vikram Singh',
    user_email: 'vikram@email.com',
    type: 'LOAN_PAYMENT',
    amount: 35000,
    due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null,
    status: 'OVERDUE',
    reference_id: 'loan-4',
    reference_name: 'Business Loan',
  },
  {
    id: 'p6',
    user_id: 'u3',
    user_name: 'Amit Patel',
    user_email: 'amit@email.com',
    type: 'CREDIT_CARD_INTEREST',
    amount: 2500,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: null,
    status: 'PENDING',
    reference_id: 'card-2',
    reference_name: '****7890',
  },
];

const AdminPaymentTracking: React.FC<AdminPaymentTrackingProps> = ({ user }) => {
  const { formatCurrency } = useSystemConfig();
  const [activeTab, setActiveTab] = useState<'users' | 'payments'>('users');
  const [users, setUsers] = useState<UserPaymentSummary[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'pending' | 'paid'>('all');
  const [selectedUser, setSelectedUser] = useState<UserPaymentSummary | null>(null);
  const [stats, setStats] = useState<{ overdue_count: number; overdue_amount: number; pending_count: number; total_active_loans: number; total_outstanding: number } | null>(null);

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('aura_session_token');
  };

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch users, payments, and stats in parallel
        const [usersRes, paymentsRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/ai/payment-tracking/users`, { headers }),
          fetch(`${API_BASE}/admin/ai/payment-tracking/payments`, { headers }),
          fetch(`${API_BASE}/admin/ai/payment-tracking/stats`, { headers }),
        ]);

        const usersData = await usersRes.json();
        const paymentsData = await paymentsRes.json();
        const statsData = await statsRes.json();

        console.log('Payment Tracking API Response:', { usersData, paymentsData, statsData });

        if (usersData.success) {
          console.log('Setting users:', usersData.data?.length, 'users');
          setUsers(usersData.data);
        } else {
          console.error('Failed to fetch users:', usersData);
        }
        if (paymentsData.success) {
          console.log('Setting payments:', paymentsData.data?.length, 'payments');
          setPayments(paymentsData.data);
        } else {
          console.error('Failed to fetch payments:', paymentsData);
        }
        if (statsData.success) {
          setStats(statsData.data);
        }
      } catch (error) {
        console.error('Error fetching payment data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'PENDING': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'OVERDUE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'PARTIALLY_PAID': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LOAN_PAYMENT': return 'payments';
      case 'LOAN_INTEREST': return 'percent';
      case 'CREDIT_CARD_BILL': return 'credit_card';
      case 'CREDIT_CARD_INTEREST': return 'trending_up';
      default: return 'receipt';
    }
  };

  const filteredUsers = users.filter(u => 
    u.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status.toLowerCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Use API stats if available, otherwise calculate from local data
  const overdueCount = stats?.overdue_count ?? payments.filter(p => p.status === 'OVERDUE').length;
  const pendingCount = stats?.pending_count ?? payments.filter(p => p.status === 'PENDING').length;
  const totalOverdueAmount = stats?.overdue_amount ?? payments.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = stats?.total_outstanding ?? 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
            Payment Tracking
          </h2>
          <p className="text-slate-500">Monitor user loans, interest payments, and credit card bills</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
          Payment Tracking
        </h2>
        <p className="text-slate-500">Monitor user loans, interest payments, and credit card bills</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <span className="text-sm font-bold text-red-600 uppercase">Overdue Payments</span>
          </div>
          <p className="text-3xl font-black text-red-600">{overdueCount}</p>
          <p className="text-sm text-red-500 mt-1">Total: {formatCurrency(totalOverdueAmount)}</p>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-amber-500">schedule</span>
            <span className="text-sm font-bold text-amber-600 uppercase">Pending</span>
          </div>
          <p className="text-3xl font-black text-amber-600">{pendingCount}</p>
          <p className="text-sm text-amber-500 mt-1">Upcoming payments</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-green-500">check_circle</span>
            <span className="text-sm font-bold text-green-600 uppercase">Good Standing</span>
          </div>
          <p className="text-3xl font-black text-green-600">{users.filter(u => u.payment_health_score >= 80).length}</p>
          <p className="text-sm text-green-500 mt-1">Users with 80%+ score</p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-blue-500">account_balance_wallet</span>
            <span className="text-sm font-bold text-blue-600 uppercase">Total Outstanding</span>
          </div>
          <p className="text-3xl font-black text-blue-600">{formatCurrency(totalOutstanding)}</p>
          <p className="text-sm text-blue-500 mt-1">{users.length} users with loans</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-sm">group</span>
          User Overview
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'payments' 
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-sm">receipt_long</span>
          All Payments
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-primary"
          />
        </div>
        {activeTab === 'payments' && (
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-12 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
        </div>
      ) : activeTab === 'users' ? (
        /* User Overview Table */
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-6 py-4 font-bold text-sm text-slate-500">User</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Health Score</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Active Loans</th>
                  <th className="text-right px-4 py-4 font-bold text-sm text-slate-500">Loan Amount</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Loan Payments</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Credit Cards</th>
                  <th className="text-right px-4 py-4 font-bold text-sm text-slate-500">Card Balance</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Overdue</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="size-10 rounded-full" alt="" />
                        <div>
                          <p className="font-bold">{u.user_name}</p>
                          <p className="text-xs text-slate-500">{u.user_email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${getHealthScoreColor(u.payment_health_score)}`}>
                        {u.payment_health_score}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center font-bold">{u.active_loans}</td>
                    <td className="px-4 py-4 text-right font-bold">{formatCurrency(u.total_loan_amount)}</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-green-600 font-bold">{u.loan_payments_made}</span>
                        <span className="text-slate-400">/</span>
                        <span className="text-amber-600 font-bold">{u.loan_payments_pending}</span>
                        {u.loan_payments_overdue > 0 && (
                          <span className="text-red-600 font-bold">({u.loan_payments_overdue} overdue)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold">{u.credit_cards}</td>
                    <td className="px-4 py-4 text-right font-bold">{formatCurrency(u.credit_card_balance)}</td>
                    <td className="px-4 py-4 text-center">
                      {u.loan_payments_overdue + u.credit_card_payments_overdue > 0 ? (
                        <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
                          {u.loan_payments_overdue + u.credit_card_payments_overdue}
                        </span>
                      ) : (
                        <span className="text-green-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-sm font-bold transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Payments Table */
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800">
                  <th className="text-left px-6 py-4 font-bold text-sm text-slate-500">User</th>
                  <th className="text-left px-4 py-4 font-bold text-sm text-slate-500">Type</th>
                  <th className="text-left px-4 py-4 font-bold text-sm text-slate-500">Reference</th>
                  <th className="text-right px-4 py-4 font-bold text-sm text-slate-500">Amount</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Due Date</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Paid Date</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Status</th>
                  <th className="text-center px-4 py-4 font-bold text-sm text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold">{p.user_name}</p>
                        <p className="text-xs text-slate-500">{p.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-sm">{getTypeIcon(p.type)}</span>
                        <span className="text-sm font-medium">{p.type.replace(/_/g, ' ')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {p.reference_name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-bold">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-4 text-center text-sm">
                      {new Date(p.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-center text-sm">
                      {p.paid_date ? new Date(p.paid_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {p.status === 'OVERDUE' && (
                        <button className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-bold transition-colors">
                          Send Reminder
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src={selectedUser.avatar} className="size-14 rounded-full" alt="" />
                <div>
                  <h3 className="text-xl font-bold">{selectedUser.user_name}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.user_email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Health Score */}
              <div className="text-center">
                <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-2xl font-black ${getHealthScoreColor(selectedUser.payment_health_score)}`}>
                  <span className="material-symbols-outlined">favorite</span>
                  {selectedUser.payment_health_score}% Payment Health
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">account_balance</span>
                  Loan Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Total Loans</p>
                    <p className="text-xl font-bold">{selectedUser.total_loans}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Active</p>
                    <p className="text-xl font-bold text-primary">{selectedUser.active_loans}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Total Amount</p>
                    <p className="text-xl font-bold">{formatCurrency(selectedUser.total_loan_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Payments Made</p>
                    <p className="text-xl font-bold text-green-600">{selectedUser.loan_payments_made}</p>
                  </div>
                </div>
                {selectedUser.loan_payments_overdue > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="font-bold">{selectedUser.loan_payments_overdue} overdue loan payments</span>
                  </div>
                )}
              </div>

              {/* Credit Card Details */}
              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl space-y-4">
                <h4 className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">credit_card</span>
                  Credit Card Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Cards</p>
                    <p className="text-xl font-bold">{selectedUser.credit_cards}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Total Balance</p>
                    <p className="text-xl font-bold text-amber-600">{formatCurrency(selectedUser.credit_card_balance)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Payments Made</p>
                    <p className="text-xl font-bold text-green-600">{selectedUser.credit_card_payments_made}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Overdue</p>
                    <p className={`text-xl font-bold ${selectedUser.credit_card_payments_overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedUser.credit_card_payments_overdue || '0'}
                    </p>
                  </div>
                </div>
                {selectedUser.credit_card_payments_overdue > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                    <span className="material-symbols-outlined">warning</span>
                    <span className="font-bold">{selectedUser.credit_card_payments_overdue} overdue credit card payments</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button className="flex-1 h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover transition-colors">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Send Payment Reminder
                </button>
                <button className="flex-1 h-12 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-sm">history</span>
                  View Full History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPaymentTracking;
