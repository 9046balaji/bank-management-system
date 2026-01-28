
import React, { useState, useEffect } from 'react';
import { UserState } from '../types';
import { loanApi, mlApi } from '../src/services/api';

interface LoanApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  requested_amount: number;
  monthly_income: number | null;
  credit_score: number | null;
  ai_risk_score: number | null;
  ml_approval_probability?: number;
  ml_recommendation?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applied_at: string;
  reviewed_at: string | null;
}

interface AdminLoanApprovalsProps {
  user: UserState;
}

// Demo loan applications for hackathon
const DEMO_APPLICATIONS: LoanApplication[] = [
  {
    id: 'demo-1',
    user_id: 'user-101',
    full_name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    requested_amount: 500000,
    monthly_income: 85000,
    credit_score: 780,
    ai_risk_score: 85,
    ml_approval_probability: 0.92,
    ml_recommendation: 'APPROVE',
    status: 'PENDING',
    applied_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-2',
    user_id: 'user-102',
    full_name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    requested_amount: 750000,
    monthly_income: 120000,
    credit_score: 720,
    ai_risk_score: 72,
    ml_approval_probability: 0.78,
    ml_recommendation: 'REVIEW',
    status: 'PENDING',
    applied_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-3',
    user_id: 'user-103',
    full_name: 'Amit Patel',
    email: 'amit.patel@email.com',
    requested_amount: 1200000,
    monthly_income: 45000,
    credit_score: 580,
    ai_risk_score: 35,
    ml_approval_probability: 0.23,
    ml_recommendation: 'REJECT',
    status: 'PENDING',
    applied_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    reviewed_at: null,
  },
  {
    id: 'demo-4',
    user_id: 'user-104',
    full_name: 'Sunita Reddy',
    email: 'sunita.reddy@email.com',
    requested_amount: 300000,
    monthly_income: 95000,
    credit_score: 810,
    ai_risk_score: 92,
    ml_approval_probability: 0.96,
    ml_recommendation: 'APPROVE',
    status: 'APPROVED',
    applied_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-5',
    user_id: 'user-105',
    full_name: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    requested_amount: 2000000,
    monthly_income: 55000,
    credit_score: 520,
    ai_risk_score: 22,
    ml_approval_probability: 0.15,
    ml_recommendation: 'REJECT',
    status: 'REJECTED',
    applied_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const AdminLoanApprovals: React.FC<AdminLoanApprovalsProps> = ({ user }) => {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [mlAnalyzing, setMlAnalyzing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    if (demoMode) {
      loadDemoData();
    } else {
      fetchApplications();
    }
  }, [demoMode]);

  const loadDemoData = () => {
    setLoading(true);
    setTimeout(() => {
      setApplications(DEMO_APPLICATIONS);
      setLoading(false);
    }, 800);
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getApplications();
      if (response.success) {
        setApplications((response.data || []) as LoanApplication[]);
      } else {
        setError('Failed to load applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Demo mode handlers
  const handleDemoReview = (id: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(id);
    setTimeout(() => {
      setApplications(prev => prev.map(app => 
        app.id === id 
          ? { ...app, status, reviewed_at: new Date().toISOString() } 
          : app
      ));
      setProcessing(null);
    }, 1500);
  };

  // Run ML analysis on pending applications
  const runMlAnalysis = async () => {
    const pendingApps = applications.filter(app => app.status === 'PENDING');
    if (pendingApps.length === 0) return;

    setMlAnalyzing(true);
    try {
      // Analyze each pending application with ML
      const updatedApps = await Promise.all(
        applications.map(async (app) => {
          if (app.status !== 'PENDING') return app;

          try {
            const mlResponse = await mlApi.predictLoan({
              Gender: 'Male', // Default, could be from user profile
              Married: 'Yes',
              Dependents: '0',
              Education: 'Graduate',
              Self_Employed: 'No',
              ApplicantIncome: app.monthly_income || 5000,
              CoapplicantIncome: 0,
              LoanAmount: app.requested_amount / 1000, // Convert to thousands
              Loan_Amount_Term: 360,
              Credit_History: app.credit_score && app.credit_score > 600 ? 1 : 0,
              Property_Area: 'Urban',
            });

            if (mlResponse.success) {
              const data = mlResponse as {
                approval_probability?: number;
                recommendation?: string;
              };
              return {
                ...app,
                ml_approval_probability: data.approval_probability,
                ml_recommendation: data.recommendation,
              };
            }
          } catch (e) {
            console.error('ML analysis error for app:', app.id, e);
          }
          return app;
        })
      );

      setApplications(updatedApps);
    } catch (err) {
      console.error('ML analysis failed:', err);
    } finally {
      setMlAnalyzing(false);
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(id);
      const response = await loanApi.reviewApplication(id, status, user.name);
      if (response.success) {
        // Refresh applications list
        await fetchApplications();
      } else {
        setError(response.error || 'Failed to process application');
      }
    } catch (err) {
      console.error('Error reviewing application:', err);
      setError('Failed to process application');
    } finally {
      setProcessing(null);
    }
  };

  const getRiskLevel = (score: number | null): { level: string; color: string } => {
    if (!score) return { level: 'UNKNOWN', color: 'slate' };
    if (score >= 70) return { level: 'LOW', color: 'emerald' };
    if (score >= 50) return { level: 'MEDIUM', color: 'amber' };
    return { level: 'HIGH', color: 'red' };
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter to show pending applications first
  const pendingApps = applications.filter(app => app.status === 'PENDING');
  const reviewedApps = applications.filter(app => app.status !== 'PENDING');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Approval Desk</h2>
          <p className="text-slate-500">Review and process pending loan applications.</p>
        </div>
        <div className="flex gap-3">
           <button
             onClick={() => setDemoMode(!demoMode)}
             className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all ${
               demoMode 
                 ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                 : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
             }`}
           >
             <span className="material-symbols-outlined text-sm">{demoMode ? 'auto_awesome' : 'cloud_sync'}</span>
             {demoMode ? 'Demo' : 'Live'}
           </button>
           <button 
             onClick={runMlAnalysis}
             disabled={mlAnalyzing || pendingApps.length === 0}
             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
           >
             <span className="material-symbols-outlined text-sm">{mlAnalyzing ? 'progress_activity' : 'smart_toy'}</span> 
             {mlAnalyzing ? 'Analyzing...' : 'ML Analysis'}
           </button>
           <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">download</span> Export Report
           </button>
           <button className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">add</span> New Manual Case
           </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          <p className="mt-4 text-slate-500">Loading applications...</p>
        </div>
      ) : pendingApps.length === 0 && reviewedApps.length === 0 ? (
        <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300">inbox</span>
          <p className="mt-4 text-slate-500">No loan applications found</p>
        </div>
      ) : (
        <>
          {/* Pending Applications */}
          {pendingApps.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50 dark:bg-amber-900/20">
                <span className="text-xs font-black uppercase tracking-widest text-amber-600">Pending Review ({pendingApps.length})</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5">Applicant</th>
                    <th className="px-8 py-5">Amount</th>
                    <th className="px-8 py-5">AI Risk Score</th>
                    <th className="px-8 py-5">ML Prediction</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {pendingApps.map((app) => {
                    const risk = getRiskLevel(app.ai_risk_score);
                    const mlProb = app.ml_approval_probability;
                    return (
                      <React.Fragment key={app.id}>
                        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="size-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                                {app.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-bold text-sm">{app.full_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500 font-mono">{app.id.slice(0, 8)} • {formatDate(app.applied_at)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 font-black">${parseFloat(String(app.requested_amount)).toLocaleString()}</td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit bg-${risk.color}-100 text-${risk.color}-600`}>
                              <span className="material-symbols-outlined text-[14px]">
                                {risk.level === 'LOW' ? 'shield_check' : risk.level === 'MEDIUM' ? 'warning' : 'dangerous'}
                              </span>
                              {risk.level} RISK ({app.ai_risk_score || 'N/A'}/100)
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {mlProb !== undefined ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${mlProb > 0.7 ? 'bg-emerald-500' : mlProb > 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${mlProb * 100}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-bold ${mlProb > 0.7 ? 'text-emerald-600' : mlProb > 0.4 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {Math.round(mlProb * 100)}%
                                  </span>
                                </div>
                                {app.ml_recommendation && (
                                  <p className="text-[10px] text-slate-500 max-w-[200px] truncate" title={app.ml_recommendation}>
                                    {app.ml_recommendation}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Run ML Analysis</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right space-x-2">
                            <button 
                              onClick={() => demoMode ? handleDemoReview(app.id, 'APPROVED') : handleReview(app.id, 'APPROVED')}
                              disabled={processing === app.id}
                              className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors disabled:opacity-50" 
                              title="Approve"
                            >
                              <span className="material-symbols-outlined">{processing === app.id ? 'progress_activity' : 'check_circle'}</span>
                            </button>
                            <button 
                              onClick={() => demoMode ? handleDemoReview(app.id, 'REJECTED') : handleReview(app.id, 'REJECTED')}
                              disabled={processing === app.id}
                              className="p-2 hover:bg-warning/10 text-warning rounded-lg transition-colors disabled:opacity-50" 
                              title="Reject"
                            >
                              <span className="material-symbols-outlined">cancel</span>
                            </button>
                            <button 
                              onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" 
                              title="View Details"
                            >
                              <span className="material-symbols-outlined">{expandedApp === app.id ? 'expand_less' : 'visibility'}</span>
                            </button>
                          </td>
                        </tr>
                        {expandedApp === app.id && (
                          <tr>
                            <td colSpan={5} className="px-8 pb-8 pt-0">
                              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">auto_awesome</span> AI Risk Assessment
                                  </p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <span className={`font-bold text-${risk.color}-500`}>
                                      {risk.level === 'LOW' ? 'Low risk applicant.' : risk.level === 'MEDIUM' ? 'Caution advised.' : 'High risk - careful review needed.'}
                                    </span>{' '}
                                    {app.credit_score && app.credit_score >= 700 
                                      ? 'Good credit history indicates reliable repayment potential.' 
                                      : 'Credit profile requires additional verification.'}
                                  </p>
                                </div>
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase text-slate-400">Financial Snapshot</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] text-slate-500">Credit Score</p>
                                      <p className="font-bold text-sm">
                                        {app.credit_score || 'N/A'}{' '}
                                        {app.credit_score && (
                                          <span className={`text-xs ${app.credit_score >= 750 ? 'text-emerald-500' : app.credit_score >= 650 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {app.credit_score >= 750 ? 'Excellent' : app.credit_score >= 650 ? 'Fair' : 'Poor'}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500">Monthly Income</p>
                                      <p className="font-bold text-sm">{app.monthly_income ? `$${parseFloat(String(app.monthly_income)).toLocaleString()}` : 'N/A'}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black uppercase text-slate-400">Contact</p>
                                  <div className="space-y-2">
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{app.email}</p>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Reviewed Applications */}
          {reviewedApps.length > 0 && (
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Previously Reviewed ({reviewedApps.length})</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-8 py-5">Applicant</th>
                    <th className="px-8 py-5">Amount</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {reviewedApps.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors opacity-60">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="size-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">
                            {app.full_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{app.full_name || 'Unknown'}</p>
                            <p className="text-xs text-slate-500 font-mono">{app.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-black">${parseFloat(String(app.requested_amount)).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right text-xs text-slate-500">
                        {app.reviewed_at ? formatDate(app.reviewed_at) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminLoanApprovals;
