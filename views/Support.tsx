
import React, { useState } from 'react';
import { UserState, Ticket } from '../types';

interface SupportProps {
  user: UserState;
  onNewTicket: (t: Ticket) => void;
}

const Support: React.FC<SupportProps> = ({ user, onNewTicket }) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Ticket['category']>('ACCOUNT');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNewTicket({
      id: `TK-${Math.floor(Math.random()*9000 + 1000)}`,
      subject,
      category,
      description: desc,
      status: 'OPEN',
      createdAt: new Date().toISOString().split('T')[0]
    });
    setSubject('');
    setDesc('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Support Portal</h2>
          <p className="text-slate-500">How can we help you today?</p>
        </div>
        <button className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined">chat</span> Live Chat
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">add_circle</span> New Ticket
             </h3>
             <form onSubmit={handleSubmit} className="space-y-6">
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Subject</span>
                  <input 
                    type="text" required value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary"
                    placeholder="Brief summary"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Category</span>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value as Ticket['category'])}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary"
                  >
                    <option value="ACCOUNT">Account Access</option>
                    <option value="FRAUD">Fraud/Security</option>
                    <option value="TECH">Technical Support</option>
                    <option value="OTHER">General Inquiry</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Description</span>
                  <textarea 
                    required value={desc} onChange={e => setDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary h-32 resize-none"
                    placeholder="Provide more details..."
                  />
                </label>
                <button className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Submit Ticket</button>
             </form>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <h3 className="text-xl font-bold">Ticket History</h3>
           <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 dark:border-slate-800">
                    <tr>
                       <th className="px-6 py-4">Ticket ID</th>
                       <th className="px-6 py-4">Subject</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Created</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {user.tickets.map(ticket => (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">{ticket.id}</td>
                        <td className="px-6 py-4 font-bold text-sm">{ticket.subject}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                             ticket.status === 'OPEN' ? 'bg-primary/10 text-primary' : 
                             ticket.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' : 
                             'bg-emerald-100 text-emerald-700'
                           }`}>
                             {ticket.status.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">{ticket.createdAt}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
