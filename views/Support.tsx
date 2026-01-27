
import React, { useState, useEffect } from 'react';
import { UserState, Ticket } from '../types';
import { supportApi } from '../src/services/api';

interface SupportProps {
  user: UserState;
  onNewTicket: (t: Ticket) => void;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const Support: React.FC<SupportProps> = ({ user, onNewTicket }) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Ticket['category']>('ACCOUNT');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>(user.tickets);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Fetch tickets on mount
  useEffect(() => {
    const fetchTickets = async () => {
      if (!user.id) return;
      
      setTicketLoading(true);
      try {
        const response = await supportApi.getByUserId(user.id);
        if (response.success && response.data) {
          setTickets(response.data as Ticket[]);
        }
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
        // Fall back to local tickets
        setTickets(user.tickets);
      } finally {
        setTicketLoading(false);
      }
    };

    const fetchFaqs = async () => {
      try {
        const response = await supportApi.getFaqs();
        if (response.success && response.data) {
          setFaqs(response.data as FAQ[]);
        }
      } catch (err) {
        console.error('Failed to fetch FAQs:', err);
      }
    };

    fetchTickets();
    fetchFaqs();
  }, [user.id, user.tickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !desc.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await supportApi.create({
        user_id: user.id,
        subject: subject.trim(),
        category: category,
        description: desc.trim(),
      });

      if (response.success && response.data) {
        const newTicket: Ticket = {
          id: (response.data as any).id || `TK-${Math.floor(Math.random()*9000 + 1000)}`,
          subject: subject,
          category: category,
          description: desc,
          status: 'OPEN',
          createdAt: new Date().toISOString().split('T')[0]
        };
        
        setTickets(prev => [newTicket, ...prev]);
        onNewTicket(newTicket);
        setSubject('');
        setDesc('');
        setSuccess('Ticket submitted successfully! We\'ll get back to you soon.');
      } else {
        setError(response.error || 'Failed to submit ticket');
      }
    } catch (err) {
      // Fallback to local creation if API fails
      const newTicket: Ticket = {
        id: `TK-${Math.floor(Math.random()*9000 + 1000)}`,
        subject,
        category,
        description: desc,
        status: 'OPEN',
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setTickets(prev => [newTicket, ...prev]);
      onNewTicket(newTicket);
      setSubject('');
      setDesc('');
      setSuccess('Ticket submitted successfully!');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-primary/10 text-primary';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default:
        return 'bg-slate-100 text-slate-700';
    }
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

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined">check_circle</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
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
                    disabled={loading}
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Category</span>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value as Ticket['category'])}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary"
                    disabled={loading}
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
                    disabled={loading}
                  />
                </label>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Ticket'
                  )}
                </button>
             </form>
           </div>

           {/* FAQs Section */}
           {faqs.length > 0 && (
             <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
               <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">help</span> Quick Answers
               </h3>
               <div className="space-y-2">
                 {faqs.slice(0, 5).map((faq) => (
                   <div key={faq.id} className="border-b border-slate-100 dark:border-slate-800 last:border-none">
                     <button
                       onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                       className="w-full text-left py-3 flex justify-between items-center hover:text-primary transition-colors"
                     >
                       <span className="text-sm font-medium">{faq.question}</span>
                       <span className="material-symbols-outlined text-sm">
                         {expandedFaq === faq.id ? 'expand_less' : 'expand_more'}
                       </span>
                     </button>
                     {expandedFaq === faq.id && (
                       <p className="text-sm text-slate-500 pb-3">{faq.answer}</p>
                     )}
                   </div>
                 ))}
               </div>
             </div>
           )}
        </div>

        <div className="lg:col-span-8 space-y-6">
           <h3 className="text-xl font-bold">Ticket History</h3>
           <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {ticketLoading ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                  <p className="mt-4 text-slate-500">Loading tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">confirmation_number</span>
                  <p className="mt-4 text-slate-500">No tickets yet. Create your first support ticket!</p>
                </div>
              ) : (
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
                      {tickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                          <td className="px-6 py-4 text-xs font-mono font-bold text-slate-400">{ticket.id}</td>
                          <td className="px-6 py-4 font-bold text-sm">{ticket.subject}</td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusStyle(ticket.status)}`}>
                               {ticket.status.replace('_', ' ')}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">{ticket.createdAt}</td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
