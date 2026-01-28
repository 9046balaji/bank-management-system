import React, { useState, useRef, useEffect } from 'react';
import { UserState } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  source?: 'local' | 'live_web_search';
  isLoading?: boolean;
}

interface AdminChatProps {
  user: UserState;
}

const API_BASE = 'http://localhost:5000/api';

const AdminChat: React.FC<AdminChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to Aura Bank AI Assistant! I can help you with:\n\n• **Banking queries** - Account info, transactions, policies\n• **Live search** - Current RBI rates, market news, regulations\n• **Feedback analysis** - Summarize and analyze customer feedback\n• **System insights** - Loan analytics, user trends\n\nAsk me anything!',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useLiveSearch, setUseLiveSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(7);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add loading message
    const loadingId = generateId();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: useLiveSearch ? 'Searching the web...' : 'Thinking...',
      timestamp: new Date(),
      isLoading: true,
    }]);

    try {
      // Choose endpoint based on live search toggle
      const endpoint = useLiveSearch 
        ? `${API_BASE}/chat/live`
        : `${API_BASE}/admin/ai/chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          context: `User: ${user.name}, Role: Admin`,
        }),
      });

      const data = await response.json();

      // Remove loading message and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: data.success 
            ? (data.data?.response || data.data || 'I processed your request.')
            : (data.error || data.fallback_message || 'Sorry, I encountered an error.'),
          timestamp: new Date(),
          source: data.source || (useLiveSearch ? 'live_web_search' : 'local'),
        }];
      });
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        return [...filtered, {
          id: generateId(),
          role: 'assistant',
          content: 'Sorry, I couldn\'t connect to the AI service. Please ensure Ollama is running.',
          timestamp: new Date(),
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: '📊 Current RBI Rates', query: 'What are the current RBI Repo and Reverse Repo rates for 2026?', needsLive: true },
    { label: '📈 Market News', query: 'Latest Indian banking sector news and updates', needsLive: true },
    { label: '📋 Summarize Feedback', query: 'Summarize the recent customer feedback and identify key issues', needsLive: false },
    { label: '💰 Loan Analytics', query: 'Show me loan payment trends and interest collection summary', needsLive: false },
    { label: '🏦 Banking Regulations', query: 'What are the latest RBI guidelines for digital banking in India?', needsLive: true },
    { label: '💳 Card Policies', query: 'Explain our credit card approval criteria and limits', needsLive: false },
  ];

  const handleQuickAction = (action: typeof quickActions[0]) => {
    if (action.needsLive && !useLiveSearch) {
      setUseLiveSearch(true);
    }
    setInput(action.query);
  };

  const clearChat = () => {
    setMessages([{
      id: generateId(),
      role: 'system',
      content: 'Chat cleared. How can I help you?',
      timestamp: new Date(),
    }]);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">AI Assistant</h1>
          <p className="text-slate-500">Intelligent banking assistant with live web search</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Live Search Toggle */}
          <div className="flex items-center gap-3 px-4 py-2 bg-surface-light dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-primary">public</span>
            <span className="text-sm font-bold">Live Search</span>
            <button
              onClick={() => setUseLiveSearch(!useLiveSearch)}
              className={`w-12 h-6 rounded-full p-1 transition-all ${
                useLiveSearch ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <div className={`size-4 bg-white rounded-full transition-all ${useLiveSearch ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <button
            onClick={clearChat}
            className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            title="Clear chat"
          >
            <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* Live Search Info Banner */}
      {useLiveSearch && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
          <span className="material-symbols-outlined text-blue-600">travel_explore</span>
          <div>
            <p className="font-bold text-blue-800 dark:text-blue-300">Live Web Search Enabled</p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              Using DuckDuckGo to fetch real-time data like RBI rates, news, and market info
            </p>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Window */}
        <div className="lg:col-span-3 bg-surface-light dark:bg-surface-dark rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-2xl rounded-br-md'
                      : message.role === 'system'
                      ? 'bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl'
                      : 'bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md'
                  } p-4 shadow-sm`}
                >
                  {message.role !== 'user' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`material-symbols-outlined text-lg ${
                        message.role === 'system' ? 'text-primary' : 'text-emerald-600'
                      }`}>
                        {message.role === 'system' ? 'info' : 'smart_toy'}
                      </span>
                      <span className="text-xs font-bold uppercase text-slate-500">
                        {message.role === 'system' ? 'System' : 'AI Assistant'}
                      </span>
                      {message.source === 'live_web_search' && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">public</span>
                          Web
                        </span>
                      )}
                    </div>
                  )}
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span className="text-sm">{message.content}</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-slate-400'}`}>
                    {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={useLiveSearch 
                  ? "Ask anything - I'll search the web for real-time info..." 
                  : "Ask about banking, feedback, loans, or system insights..."
                }
                className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-6 bg-primary text-white rounded-xl font-bold disabled:opacity-50 hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-surface-light dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">bolt</span>
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(action)}
                  className="w-full text-left p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-between group"
                >
                  <span>{action.label}</span>
                  {action.needsLive && (
                    <span className="material-symbols-outlined text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">public</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities Card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl border border-primary/20 p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined">auto_awesome</span>
              Capabilities
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5 text-emerald-500">check_circle</span>
                Answer banking queries
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5 text-emerald-500">check_circle</span>
                Fetch live RBI rates & news
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5 text-emerald-500">check_circle</span>
                Analyze customer feedback
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5 text-emerald-500">check_circle</span>
                Provide loan analytics
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-xs mt-0.5 text-emerald-500">check_circle</span>
                Explain policies & guidelines
              </li>
            </ul>
          </div>

          {/* Model Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase">Powered By</p>
            <p className="text-sm font-bold mt-1">Ollama + LangChain</p>
            <p className="text-xs text-slate-500">Local AI with Web Search</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
