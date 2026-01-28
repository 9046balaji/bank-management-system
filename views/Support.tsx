
import React, { useState, useEffect, useRef } from 'react';
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UserFeedback {
  id: string;
  rating: number;
  category: 'SERVICE' | 'APP' | 'FEATURE' | 'OTHER';
  comment: string | null;
  is_resolved: boolean;
  admin_response: string | null;
  created_at: string;
  responded_at: string | null;
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

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackCategory, setFeedbackCategory] = useState<'SERVICE' | 'APP' | 'FEATURE' | 'OTHER'>('SERVICE');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [userFeedback, setUserFeedback] = useState<UserFeedback[]>([]);
  const [feedbackHistoryLoading, setFeedbackHistoryLoading] = useState(false);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello! I\'m Aura, your AI banking assistant. How can I help you today? 🏦' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Handle chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: chatMessage.trim() };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setChatMessage('');
    setChatLoading(true);

    try {
      const response = await supportApi.chat({
        message: userMsg.content,
        history: updatedHistory.slice(-8), // Send last 8 messages for context
        userId: user.id
      });

      if (response.success) {
        const data = response as { success: boolean; reply?: string; isOffline?: boolean };
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: data.reply || "I'm sorry, I couldn't process that request."
        }]);
      } else {
        throw new Error('Chat request failed');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again or submit a support ticket for assistance."
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Quick action buttons for chat
  const quickActions = [
    { label: 'Block my card', message: 'How do I block my card?' },
    { label: 'Loan status', message: 'How can I check my loan status?' },
    { label: 'Transfer help', message: 'How do I transfer money?' },
  ];

  const handleQuickAction = (message: string) => {
    setChatMessage(message);
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);
    setError(null);

    try {
      const response = await supportApi.submitFeedback({
        user_id: user.id,
        rating: feedbackRating,
        category: feedbackCategory,
        comment: feedbackComment || undefined,
      });

      if (response.success) {
        setSuccess('Thank you for your feedback! We appreciate your input.');
        setShowFeedbackModal(false);
        setFeedbackRating(5);
        setFeedbackCategory('SERVICE');
        setFeedbackComment('');
        // Refresh feedback list
        fetchUserFeedback();
      } else {
        setError((response as any).error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('Feedback error:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Fetch user feedback
  const fetchUserFeedback = async () => {
    if (!user.id) return;
    setFeedbackHistoryLoading(true);
    try {
      const response = await supportApi.getUserFeedback(user.id);
      if (response.success && (response as any).feedback) {
        setUserFeedback((response as any).feedback as UserFeedback[]);
      }
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setFeedbackHistoryLoading(false);
    }
  };

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
    fetchUserFeedback();
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
        setError(response.error || 'Failed to submit ticket. Please try again.');
      }
    } catch (err) {
      // Show error instead of creating a fake local ticket
      console.error('Failed to submit ticket:', err);
      setError('Failed to submit ticket. Please check your connection and try again.');
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
        <div className="flex gap-3">
          <button 
            onClick={() => setShowFeedbackModal(true)}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 hover:bg-emerald-600 transition-colors"
          >
            <span className="material-symbols-outlined">rate_review</span> Give Feedback
          </button>
          <button 
            onClick={() => setShowChat(true)}
            className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">chat</span> AI Chat Assistant
          </button>
        </div>
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

           {/* Feedback History Section */}
           <h3 className="text-xl font-bold mt-8">Your Feedback</h3>
           <div className="bg-surface-light dark:bg-surface-dark border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {feedbackHistoryLoading ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                  <p className="mt-4 text-slate-500">Loading feedback...</p>
                </div>
              ) : userFeedback.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300">feedback</span>
                  <p className="mt-4 text-slate-500">No feedback submitted yet. We'd love to hear from you!</p>
                  <button 
                    onClick={() => setShowFeedbackModal(true)}
                    className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-colors"
                  >
                    Give Feedback
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {userFeedback.map(fb => (
                    <div key={fb.id} className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex">
                            {[1,2,3,4,5].map(star => (
                              <span key={star} className={`material-symbols-outlined text-lg ${star <= fb.rating ? 'text-amber-400' : 'text-slate-300'}`}>
                                star
                              </span>
                            ))}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {fb.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {fb.is_resolved ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Responded
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              Pending
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{new Date(fb.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {fb.comment && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{fb.comment}</p>
                      )}
                      {fb.admin_response && (
                        <div className="mt-3 p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
                          <p className="text-xs font-bold text-primary mb-1">Admin Response:</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{fb.admin_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* AI Chat Widget */}
      {showChat && (
        <div className="fixed bottom-6 right-6 w-[520px] h-[700px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col z-50 animate-in slide-in-from-bottom-4 duration-300">
          {/* Chat Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-primary to-blue-600 text-white rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="size-14 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">smart_toy</span>
              </div>
              <div>
                <h4 className="font-bold text-xl">Aura AI Assistant</h4>
                <p className="text-sm text-white/70">Banking Support • Online</p>
              </div>
            </div>
            <button 
              onClick={() => setShowChat(false)} 
              className="size-10 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[15px] ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-br-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3.5 rounded-2xl rounded-bl-sm">
                  <span className="flex items-center gap-2 text-slate-500">
                    <span className="size-2.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                    <span className="size-2.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                    <span className="size-2.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-6 pb-3 flex flex-wrap gap-2">
            {quickActions.map((action, idx) => (
              <button 
                key={idx}
                onClick={() => handleQuickAction(action.message)}
                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-primary hover:text-white transition-colors font-medium"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="p-5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your question..."
                disabled={chatLoading}
                className="flex-1 h-14 px-5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-primary text-[15px]"
              />
              <button 
                type="submit" 
                disabled={chatLoading || !chatMessage.trim()}
                className="size-14 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Chat Button when widget is closed */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <span className="material-symbols-outlined text-2xl">chat</span>
        </button>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">rate_review</span>
                Share Your Feedback
              </h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-6">
              {/* Star Rating */}
              <div className="space-y-2">
                <label className="text-sm font-bold">How would you rate your experience?</label>
                <div className="flex gap-2 justify-center py-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <span className={`material-symbols-outlined text-4xl ${star <= feedbackRating ? 'text-amber-400' : 'text-slate-300'}`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-slate-500">
                  {feedbackRating === 1 && 'Poor'}
                  {feedbackRating === 2 && 'Fair'}
                  {feedbackRating === 3 && 'Good'}
                  {feedbackRating === 4 && 'Very Good'}
                  {feedbackRating === 5 && 'Excellent'}
                </p>
              </div>

              {/* Category */}
              <label className="block space-y-2">
                <span className="text-sm font-bold">Category</span>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value as 'SERVICE' | 'APP' | 'FEATURE' | 'OTHER')}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary"
                  disabled={feedbackLoading}
                >
                  <option value="SERVICE">Customer Service</option>
                  <option value="APP">Mobile/Web App</option>
                  <option value="FEATURE">Feature Request</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              {/* Comment */}
              <label className="block space-y-2">
                <span className="text-sm font-bold">Comments (Optional)</span>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 focus:ring-2 focus:ring-primary h-32 resize-none"
                  placeholder="Tell us more about your experience..."
                  disabled={feedbackLoading}
                />
              </label>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 h-12 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  disabled={feedbackLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="flex-1 h-12 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-colors"
                >
                  {feedbackLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">send</span>
                      Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
