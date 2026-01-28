
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { cardApi } from '../src/services/api';

interface CardApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  account_number: string | null;
  card_type: string;
  requested_limit: number | null;
  monthly_income: number | null;
  employment_status: string | null;
  credit_score: number | null;
  purpose: string | null;
  ai_risk_score: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applied_at: string;
  reviewed_at: string | null;
}

interface AdminCardApprovalsProps {
  user: UserState;
}

// Demo card applications for display
const DEMO_APPLICATIONS: CardApplication[] = [
  {
    id: 'demo-card-1',
    user_id: 'user-201',
    full_name: 'Aisha Patel',
    email: 'aisha.patel@email.com',
    account_number: '1001000010',
    card_type: 'CREDIT',
    requested_limit: 50000,
    monthly_income: 95000,
    employment_status: 'EMPLOYED',
    credit_score: 760,
    purpose: 'Online shopping and travel expenses',
    ai_risk_score: 82,
    status: 'PENDING',
    applied_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-card-2',
    user_id: 'user-202',
    full_name: 'Rahul Mehta',
    email: 'rahul.mehta@email.com',
    account_number: '1001000011',
    card_type: 'CREDIT',
    requested_limit: 100000,
    monthly_income: 150000,
    employment_status: 'SELF_EMPLOYED',
    credit_score: 720,
    purpose: 'Business expenses',
    ai_risk_score: 75,
    status: 'PENDING',
    applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-card-3',
    user_id: 'user-203',
    full_name: 'Neha Singh',
    email: 'neha.singh@email.com',
    account_number: '1001000012',
    card_type: 'CREDIT',
    requested_limit: 200000,
    monthly_income: 45000,
    employment_status: 'EMPLOYED',
    credit_score: 580,
    purpose: 'Emergency fund access',
    ai_risk_score: 35,
    status: 'PENDING',
    applied_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-card-4',
    user_id: 'user-204',
    full_name: 'Vikram Joshi',
    email: 'vikram.joshi@email.com',
    account_number: '1001000013',
    card_type: 'CREDIT',
    requested_limit: 75000,
    monthly_income: 120000,
    employment_status: 'EMPLOYED',
    credit_score: 810,
    purpose: 'Travel rewards',
    ai_risk_score: 92,
    status: 'APPROVED',
    applied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const AdminCardApprovals: React.FC<AdminCardApprovalsProps> = ({ user }) => {
  const [applications, setApplications] = useState<CardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedApp, setSelectedApp] = useState<CardApplication | null>(null);

  // Fetch real applications from API
  const fetchApplications = async () => {
    if (demoMode) {
      setApplications(DEMO_APPLICATIONS);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await cardApi.getApplications();
      if (response.success && response.data) {
        setApplications(response.data as CardApplication[]);
      }
    } catch (err) {
      console.error('Error fetching card applications:', err);
      setError('Failed to load card applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [demoMode]);

  // Demo mode review handler
  const handleDemoReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(id);
    setTimeout(() => {
      setApplications(prev =>
        prev.map(app =>
          app.id === id
            ? { ...app, status, reviewed_at: new Date().toISOString() }
            : app
        )
      );
      setProcessing(null);
      setSelectedApp(null);
    }, 1000);
  };

  // Real API review handler
  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(id);
      // Pass user.id (UUID) for the reviewed_by field, not user.name
      const response = await cardApi.reviewApplication(id, status, user.id);
      if (response.success) {
        await fetchApplications();
        setSelectedApp(null);
      } else {
        setError(response.error || 'Failed to process application');
      }
    } catch (err) {
      console.error('Error reviewing card application:', err);
      setError('Failed to process application. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const getRiskLevel = (score: number | null): { level: string; color: string } => {
    if (!score) return { level: 'UNKNOWN', color: 'slate' };
    if (score >= 70) return { level: 'LOW RISK', color: 'emerald' };
    if (score >= 50) return { level: 'MEDIUM RISK', color: 'amber' };
    return { level: 'HIGH RISK', color: 'red' };
  };

  const getCreditScoreColor = (score: number | null): string => {
    if (!score) return 'slate';
    if (score >= 750) return 'emerald';
    if (score >= 650) return 'amber';
    return 'red';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pendingApps = applications.filter(app => app.status === 'PENDING');
  const reviewedApps = applications.filter(app => app.status !== 'PENDING');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Card Approvals</h2>
          <p className="text-slate-500">Review and process credit card applications.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
              demoMode
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {demoMode ? 'science' : 'cloud_sync'}
            </span>
            {demoMode ? 'Demo Mode' : 'Live Mode'}
          </button>
          {!demoMode && (
            <button
              onClick={fetchApplications}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-3xl font-black text-amber-600">{pendingApps.length}</p>
            </div>
            <div className="size-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600">pending</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Approved</p>
              <p className="text-3xl font-black text-emerald-600">
                {applications.filter(a => a.status === 'APPROVED').length}
              </p>
            </div>
            <div className="size-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rejected</p>
              <p className="text-3xl font-black text-red-600">
                {applications.filter(a => a.status === 'REJECTED').length}
              </p>
            </div>
            <div className="size-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600">cancel</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-3xl font-black text-primary">{applications.length}</p>
            </div>
            <div className="size-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">credit_card</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      {pendingApps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">pending_actions</span>
            Pending Review ({pendingApps.length})
          </h3>
          <div className="grid gap-4">
            {pendingApps.map(app => {
              const risk = getRiskLevel(app.ai_risk_score);
              const creditColor = getCreditScoreColor(app.credit_score);
              const isProcessing = processing === app.id;

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-4">
                        <div className="size-14 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {app.full_name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-lg">{app.full_name}</h4>
                          <p className="text-sm text-slate-500">{app.email}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Applied {formatDate(app.applied_at)}
                          </p>
                        </div>
                      </div>

                      {/* Card Details */}
                      <div className="flex flex-wrap gap-6">
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Card Type</p>
                          <p className="font-bold text-slate-900 dark:text-white">{app.card_type}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Limit Requested</p>
                          <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(app.requested_limit)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Monthly Income</p>
                          <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(app.monthly_income)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Credit Score</p>
                          <p className={`font-bold text-${creditColor}-600`}>{app.credit_score || 'N/A'}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">AI Risk Score</p>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-${risk.color}-100 dark:bg-${risk.color}-900/30`}>
                            <span className={`text-${risk.color}-600 font-bold`}>{app.ai_risk_score || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => demoMode ? handleDemoReview(app.id, 'APPROVED') : handleReview(app.id, 'APPROVED')}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm">check</span>
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => demoMode ? handleDemoReview(app.id, 'REJECTED') : handleReview(app.id, 'REJECTED')}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Reject
                        </button>
                      </div>
                    </div>

                    {/* Purpose */}
                    {app.purpose && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Purpose</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{app.purpose}</p>
                      </div>
                    )}

                    {/* Risk Assessment Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                        <span>Risk Assessment</span>
                        <span className={`text-${risk.color}-600`}>{risk.level}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-${risk.color}-500 transition-all duration-500`}
                          style={{ width: `${app.ai_risk_score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviewed Applications */}
      {reviewedApps.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400">history</span>
            Review History ({reviewedApps.length})
          </h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Card Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Limit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Credit Score</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {reviewedApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{app.full_name}</p>
                        <p className="text-sm text-slate-500">{app.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{app.card_type}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{formatCurrency(app.requested_limit)}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold text-${getCreditScoreColor(app.credit_score)}-600`}>
                        {app.credit_score || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        app.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {app.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                        </span>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {app.reviewed_at ? formatDate(app.reviewed_at) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {applications.length === 0 && !loading && (
        <div className="text-center py-16">
          <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-slate-400">credit_card_off</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Applications</h3>
          <p className="text-slate-500">There are no card applications to review at this time.</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
            <span className="text-slate-500 font-medium">Loading applications...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCardApprovals;
