
import React from 'react';
import { UserState } from '../types';

interface AdminLoanApprovalsProps {
  user: UserState;
}

const AdminLoanApprovals: React.FC<AdminLoanApprovalsProps> = ({ user }) => {
  const apps = [
    { id: 'L-9021', name: 'Sarah Jenkins', amount: 45000, date: 'Oct 24, 2023', score: '92/100', risk: 'LOW' },
    { id: 'L-9022', name: 'Michael Ross', amount: 12500, date: 'Oct 24, 2023', score: '65/100', risk: 'MEDIUM' },
    { id: 'L-9023', name: 'David Chen', amount: 85000, date: 'Oct 23, 2023', score: '58/100', risk: 'HIGH' },
    { id: 'L-9024', name: 'Emily Blunt', amount: 5000, date: 'Oct 23, 2023', score: '88/100', risk: 'LOW' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Approval Desk</h2>
          <p className="text-slate-500">Review and process pending loan applications.</p>
        </div>
        <div className="flex gap-3">
           <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">download</span> Export Report
           </button>
           <button className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2">
             <span className="material-symbols-outlined text-sm">add</span> New Manual Case
           </button>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
         <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
               <tr>
                  <th className="px-8 py-5">Applicant</th>
                  <th className="px-8 py-5">Amount</th>
                  <th className="px-8 py-5">AI Risk Score</th>
                  <th className="px-8 py-5 text-right">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
               {apps.map((app) => (
                 <React.Fragment key={app.id}>
                   <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                            <div className="size-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                               {app.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-sm">{app.name}</p>
                               <p className="text-xs text-slate-500 font-mono">{app.id} • {app.date}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6 font-black">${app.amount.toLocaleString()}</td>
                      <td className="px-8 py-6">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                            app.risk === 'LOW' ? 'bg-emerald-100 text-emerald-600' :
                            app.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                         }`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {app.risk === 'LOW' ? 'shield_check' : app.risk === 'MEDIUM' ? 'warning' : 'dangerous'}
                            </span>
                            {app.risk} RISK ({app.score})
                         </span>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2">
                         <button className="p-2 hover:bg-success/10 text-success rounded-lg transition-colors" title="Approve">
                            <span className="material-symbols-outlined">check_circle</span>
                         </button>
                         <button className="p-2 hover:bg-warning/10 text-warning rounded-lg transition-colors" title="Reject">
                            <span className="material-symbols-outlined">cancel</span>
                         </button>
                         <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="View Details">
                            <span className="material-symbols-outlined">visibility</span>
                         </button>
                      </td>
                   </tr>
                   {app.id === 'L-9022' && (
                     <tr>
                        <td colSpan={4} className="px-8 pb-8 pt-0">
                           <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">auto_awesome</span> AI Risk Assessment
                                 </p>
                                 <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    <span className="font-bold text-amber-500">Caution advised.</span> Applicant has high credit utilization (46%) recently. However, employment history is stable (4 years).
                                 </p>
                              </div>
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-slate-400">Financial Snapshot</p>
                                 <div className="grid grid-cols-2 gap-4">
                                    <div>
                                       <p className="text-[10px] text-slate-500">Credit Score</p>
                                       <p className="font-bold text-sm">680 <span className="text-xs text-amber-500">Fair</span></p>
                                    </div>
                                    <div>
                                       <p className="text-[10px] text-slate-500">Annual Income</p>
                                       <p className="font-bold text-sm">$72,000</p>
                                    </div>
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <p className="text-[10px] font-black uppercase text-slate-400">Documents</p>
                                 <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-700">
                                       <span className="flex items-center gap-2"><span className="material-symbols-outlined text-red-500 text-sm">picture_as_pdf</span> Tax_Return_2023.pdf</span>
                                       <span className="material-symbols-outlined text-sm text-slate-400">visibility</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </td>
                     </tr>
                   )}
                 </React.Fragment>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};

export default AdminLoanApprovals;
