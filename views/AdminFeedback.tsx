import React, { useState, useEffect } from 'react';
import { UserState } from '../types';

import { FeedbackItem, FeedbackStats, AIInsight } from '../types';

interface AdminFeedbackProps {
  user: UserState;
}

import api from '../src/services/api';

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

      const data = await api.adminAi.getFeedback(filters);
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
      const data = await api.adminAi.getStats();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const data = await api.adminAi.getInsights();
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
      const data = await api.adminAi.summarize(selectedIds, user.id);
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

  const handleSummarizeAll = async () => {
    if (feedback.length === 0) return;

    setSummarizing(true);
    try {
      // Get all feedback IDs
      const allFeedbackIds = feedback.map(f => f.id);
      const data = await api.adminAi.summarize(allFeedbackIds, user.id);
      if (data.success) {
        setCurrentInsight(data.data.ai_response);
        fetchInsights();
        // Switch to insights tab to show the result
        setActiveTab('insights');
      }
    } catch (error) {
      console.error('Error summarizing all feedback:', error);
    } finally {
      setSummarizing(false);
    }
  };

  const handleRespond = async (feedbackId: string) => {
    if (!responseText.trim()) return;

    try {
      const data = await api.adminAi.respond(feedbackId, responseText, user.id);
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
      const data = await api.adminAi.chat(userMessage, `Feedback stats: ${JSON.stringify(stats)}`);
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Sorry, I encountered an error.' }]);
      }
    } catch (error: any) {
      console.error('Error in chat:', error);
      const errorMessage = error?.message || 'Sorry, I encountered an error. Please make sure you are logged in as an admin.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
          {/* Summarize All Button - always visible */}
          <button
            onClick={handleSummarizeAll}
            disabled={summarizing || feedback.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            <span className="material-symbols-outlined text-sm">summarize</span>
            {summarizing ? 'Analyzing...' : `Summarize All (${feedback.length})`}
          </button>
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
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab
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

          {currentInsight.solved_issues?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-500 mb-2">Solved Issues</h4>
              <div className="flex flex-wrap gap-2">
                {currentInsight.solved_issues.map((issue: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentInsight.unsolved_issues?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-500 mb-2">Unsolved Issues</h4>
              <div className="flex flex-wrap gap-2">
                {currentInsight.unsolved_issues.map((issue: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {issue}
                  </span>
                ))}
              </div>
            </div>
          )}

          {currentInsight.key_issues?.length > 0 && !currentInsight.unsolved_issues?.length && (
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
                  {insight.solved_issues && insight.solved_issues.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">Solved Issues</h4>
                      <div className="space-y-1">
                        {insight.solved_issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insight.unsolved_issues && insight.unsolved_issues.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-slate-500 mb-2">Unsolved Issues</h4>
                      <div className="space-y-1">
                        {insight.unsolved_issues.map((issue, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {insight.key_issues?.length > 0 && !insight.unsolved_issues?.length && (
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
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50 overflow-hidden">
          {/* Chat Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-blue-500/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="size-12 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="material-symbols-outlined text-white text-xl">psychology</span>
                </div>
                <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-xs">check</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Feedback Analysis Assistant
                </h3>
                <p className="text-sm text-slate-500">Ask questions about feedback, get summaries, or analyze trends</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <span className="material-symbols-outlined text-amber-600 text-sm">info</span>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Feedback queries only</span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="h-[450px] overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30">
            {chatMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="size-20 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <span className="material-symbols-outlined text-4xl text-purple-600 dark:text-purple-400">forum</span>
                </div>
                <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Start a conversation</h4>
                <p className="text-slate-500 mb-6">Ask about feedback patterns, summarize complaints, or analyze trends</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {[
                    { icon: 'summarize', text: 'Summarize recent complaints' },
                    { icon: 'priority_high', text: 'What are the top issues?' },
                    { icon: 'check_circle', text: 'Show me resolved feedback' },
                    { icon: 'fiber_new', text: 'List new complaints' },
                    { icon: 'sentiment_satisfied', text: 'How is user satisfaction?' },
                    { icon: 'bug_report', text: 'Retrieve all bug reports' },
                  ].map(suggestion => (
                    <button
                      key={suggestion.text}
                      onClick={() => setChatInput(suggestion.text)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-sm hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm text-purple-600">{suggestion.icon}</span>
                      {suggestion.text}
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
                  <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {msg.role === 'user' ? (
                      <div className="shrink-0 size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-white text-lg">person</span>
                      </div>
                    ) : (
                      <div className="shrink-0 size-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <span className="material-symbols-outlined text-white text-lg">psychology</span>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div
                      className={`relative p-4 ${msg.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-md shadow-lg shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-700 rounded-2xl rounded-tl-md shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-600'
                        }`}
                    >
                      {msg.role !== 'user' && (
                        <p className="text-xs font-bold uppercase mb-2 text-purple-600 dark:text-purple-400">
                          AI Assistant
                        </p>
                      )}
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user' ? '' : 'text-slate-700 dark:text-slate-200'
                      }`}>{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 size-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <span className="material-symbols-outlined text-white text-lg">psychology</span>
                  </div>
                  <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl rounded-tl-md shadow-lg">
                    <div className="flex gap-1.5">
                      <div className="size-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="size-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="size-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-xl">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                  placeholder="Ask about feedback: summarize, retrieve, analyze trends..."
                  className="w-full px-5 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-600 focus:outline-none focus:border-purple-400 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={handleChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105 transition-all flex items-center gap-2 group"
              >
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  {chatLoading ? 'hourglass_empty' : 'send'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
