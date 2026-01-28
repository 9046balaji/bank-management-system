import React, { useState, useEffect } from 'react';
import { UserState } from '../types';

interface FeedbackItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  type: string;
  category: string;
  subject: string;
  description: string;
  rating: number | null;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  responder_name: string | null;
  is_public: boolean;
  created_at: string;
}

interface FeedbackStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  average_rating: string;
  rated_count: number;
  recent_week: number;
}

interface AIInsight {
  id: string;
  summary_text: string;
  sentiment: string;
  key_issues: string[];
  action_items: string[];
  model_used: string;
  created_at: string;
}

interface AdminFeedbackProps {
  user: UserState;
}

const API_BASE = 'http://localhost:5000/api';

const AdminFeedback: React.FC<AdminFeedbackProps> = ({ user }) => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'feedback' | 'insights' | 'chat'>('feedback');
  const [filters, setFilters] = useState({
    status: 'ALL',
    type: 'ALL',
    category: 'ALL',
  });
  const [summarizing, setSummarizing] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<any>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchFeedback();
    fetchStats();
    fetchInsights();
  }, [filters]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.type !== 'ALL') params.append('type', filters.type);
      if (filters.category !== 'ALL') params.append('category', filters.category);

      const response = await fetch(`${API_BASE}/admin/ai/feedback?${params}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setFeedback(data.data);
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/ai/feedback/stats`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/ai/feedback/insights`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setInsights(data.data);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === feedback.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(feedback.map(f => f.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSummarize = async () => {
    if (selectedIds.length === 0) return;
    
    setSummarizing(true);
    try {
      const response = await fetch(`${API_BASE}/admin/ai/feedback/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          feedback_ids: selectedIds,
          admin_id: user.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setCurrentInsight(data.data.ai_response);
        fetchInsights();
      }
    } catch (error) {
      console.error('Error summarizing:', error);
    } finally {
      setSummarizing(false);
    }
  };

  const handleRespond = async (feedbackId: string) => {
    if (!responseText.trim()) return;
    
    try {
      const response = await fetch(`${API_BASE}/admin/ai/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'RESOLVED',
          admin_response: responseText,
          responded_by: user.id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setRespondingTo(null);
        setResponseText('');
        fetchFeedback();
      }
    } catch (error) {
      console.error('Error responding:', error);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE}/admin/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage,
          context: `Feedback stats: ${JSON.stringify(stats)}`,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-700';
      case 'REVIEWED': return 'bg-yellow-100 text-yellow-700';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-700';
      case 'RESOLVED': return 'bg-green-100 text-green-700';
      case 'CLOSED': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BUG': return 'bug_report';
      case 'FEATURE': return 'lightbulb';
      case 'IMPROVEMENT': return 'trending_up';
      case 'COMPLAINT': return 'sentiment_dissatisfied';
      case 'PRAISE': return 'sentiment_satisfied';
      default: return 'help';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': return 'text-green-600 bg-green-50';
      case 'NEGATIVE': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Feedback Management</h2>
          <p className="text-slate-500">View, analyze, and respond to user feedback with AI assistance</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleSummarize}
              disabled={summarizing}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              {summarizing ? 'Analyzing...' : `Summarize ${selectedIds.length} Items`}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">This Week</p>
            <p className="text-2xl font-black text-blue-600">{stats.recent_week}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">Avg Rating</p>
            <p className="text-2xl font-black text-amber-500">⭐ {stats.average_rating}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">New</p>
            <p className="text-2xl font-black text-blue-600">{stats.by_status.NEW || 0}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">In Progress</p>
            <p className="text-2xl font-black text-purple-600">{stats.by_status.IN_PROGRESS || 0}</p>
          </div>
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 uppercase font-bold">Resolved</p>
            <p className="text-2xl font-black text-green-600">{stats.by_status.RESOLVED || 0}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(['feedback', 'insights', 'chat'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                {tab === 'feedback' ? 'feedback' : tab === 'insights' ? 'psychology' : 'chat'}
              </span>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </span>
          </button>
        ))}
      </div>

      {/* Current AI Insight Panel */}
      {currentInsight && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-purple-600 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-bold">AI Analysis Result</h3>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getSentimentColor(currentInsight.sentiment)}`}>
                  {currentInsight.sentiment}
                </span>
              </div>
            </div>
            <button onClick={() => setCurrentInsight(null)} className="text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <p className="text-slate-700 dark:text-slate-300 mb-4">{currentInsight.summary}</p>
          
          {currentInsight.key_issues?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-500 mb-2">Key Issues</h4>
              <div className="flex flex-wrap gap-2">
                {currentInsight.key_issues.map((issue: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {currentInsight.action_items?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-slate-500 mb-2">Action Items</h4>
              <ul className="space-y-2">
                {currentInsight.action_items.map((item: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'feedback' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 items-center">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border-none font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border-none font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="BUG">Bug</option>
              <option value="FEATURE">Feature Request</option>
              <option value="IMPROVEMENT">Improvement</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="PRAISE">Praise</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="flex-1" />
            <span className="text-sm text-slate-500">
              {selectedIds.length} of {feedback.length} selected
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === feedback.length && feedback.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">User</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Subject</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Rating</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                  <th className="p-4 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center">
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
                    </td>
                  </tr>
                ) : feedback.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      No feedback found
                    </td>
                  </tr>
                ) : (
                  feedback.map(item => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => handleSelect(item.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-sm">{item.user_name || 'Anonymous'}</p>
                            <p className="text-xs text-slate-500">{item.user_email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-sm line-clamp-1">{item.subject}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-sm">
                            <span className="material-symbols-outlined text-sm text-primary">{getTypeIcon(item.type)}</span>
                            {item.type}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.rating ? (
                            <span className="text-amber-500 font-bold">{'⭐'.repeat(item.rating)}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setRespondingTo(respondingTo === item.id ? null : item.id)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="Respond"
                          >
                            <span className="material-symbols-outlined text-sm">reply</span>
                          </button>
                        </td>
                      </tr>
                      {respondingTo === item.id && (
                        <tr>
                          <td colSpan={8} className="p-4 bg-slate-50 dark:bg-slate-800/50">
                            <div className="space-y-3">
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg">
                                <p className="text-sm font-medium mb-1">Full Description:</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{item.description}</p>
                              </div>
                              {item.admin_response && (
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <p className="text-sm font-medium mb-1 text-green-700">Previous Response:</p>
                                  <p className="text-sm text-green-600">{item.admin_response}</p>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  placeholder="Type your response..."
                                  className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                                />
                                <button
                                  onClick={() => handleRespond(item.id)}
                                  className="px-4 py-2 bg-primary text-white rounded-lg font-bold"
                                >
                                  Send & Resolve
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">psychology</span>
              <p className="text-slate-500">No AI insights generated yet.</p>
              <p className="text-sm text-slate-400">Select feedback items and click "Summarize" to generate insights.</p>
            </div>
          ) : (
            insights.map(insight => (
              <div key={insight.id} className="bg-surface-light dark:bg-surface-dark p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getSentimentColor(insight.sentiment)}`}>
                      {insight.sentiment}
                    </span>
                    <span className="text-xs text-slate-500">
                      Model: {insight.model_used} • {formatDate(insight.created_at)}
                    </span>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300 mb-4">{insight.summary_text}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {insight.key_issues?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">Key Issues</h4>
                      <div className="space-y-1">
                        {insight.key_issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {insight.action_items?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">Action Items</h4>
                      <div className="space-y-1">
                        {insight.action_items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-green-600 text-sm">task_alt</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">smart_toy</span>
              AI Assistant
            </h3>
            <p className="text-sm text-slate-500">Ask questions about feedback, get suggestions, or analyze trends</p>
          </div>
          
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                <span className="material-symbols-outlined text-5xl mb-2">chat</span>
                <p>Start a conversation with the AI assistant</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Summarize recent complaints',
                    'What are the top issues?',
                    'How is user satisfaction trending?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setChatInput(suggestion)}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-slate-800 rounded-bl-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-bl-sm">
                  <span className="material-symbols-outlined animate-pulse">more_horiz</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask about feedback trends, issues, or suggestions..."
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none"
              />
              <button
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold disabled:opacity-50"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
