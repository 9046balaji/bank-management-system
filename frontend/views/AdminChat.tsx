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

// Session storage key for token
const SESSION_TOKEN_KEY = 'aura_session_token';

const getAuthToken = (): string | null => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

const AdminChat: React.FC<AdminChatProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to Aura Bank AI Assistant! I can help you with:\n\n• **Banking queries** - Account info, transactions, policies\n• **Live search** - Current RBI rates, market news, regulations\n• **System insights** - Loan analytics, user trends\n• **General guidance** - Banking procedures and best practices\n\n💡 **Note:** For feedback analysis, please use the Feedback Management section.\n\nAsk me anything!',
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
        : `${API_BASE}/chat/general`;

      const token = getAuthToken();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
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
    { label: '� Loan Concepts', query: 'Explain the different types of loans and their interest calculation methods', needsLive: false },
    { label: '🏦 Banking Regulations', query: 'What are the latest RBI guidelines for digital banking in India?', needsLive: true },
    { label: '💳 Card Policies', query: 'Explain credit card approval criteria and limits', needsLive: false },
    { label: '🔐 KYC Guidelines', query: 'What are the KYC requirements for opening a bank account?', needsLive: false },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="size-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <span className="material-symbols-outlined text-white text-2xl">smart_toy</span>
              </div>
              <div className="absolute -bottom-1 -right-1 size-5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xs">check</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Intelligent banking assistant with live web search</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Live Search Toggle */}
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 ${
              useLiveSearch 
                ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-300 dark:border-blue-700' 
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              <span className={`material-symbols-outlined transition-colors ${useLiveSearch ? 'text-blue-600' : 'text-slate-400'}`}>
                {useLiveSearch ? 'travel_explore' : 'public_off'}
              </span>
              <span className="text-sm font-semibold">Live Search</span>
              <button
                onClick={() => setUseLiveSearch(!useLiveSearch)}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                  useLiveSearch 
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/30' 
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div className={`absolute top-1 size-5 bg-white rounded-full shadow-md transition-all duration-300 ${
                  useLiveSearch ? 'left-8' : 'left-1'
                }`} />
              </button>
            </div>
            <button
              onClick={clearChat}
              className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all group"
              title="Clear chat"
            >
              <span className="material-symbols-outlined group-hover:animate-pulse">delete_sweep</span>
            </button>
          </div>
        </div>

        {/* Live Search Info Banner */}
        {useLiveSearch && (
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 backdrop-blur-xl rounded-2xl border border-blue-200/50 dark:border-blue-800/50">
            <div className="size-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="material-symbols-outlined text-white">travel_explore</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-blue-800 dark:text-blue-300">Live Web Search Enabled</p>
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                Using DuckDuckGo to fetch real-time data like RBI rates, news, and market info
              </p>
            </div>
            <span className="material-symbols-outlined text-blue-500 animate-pulse">wifi</span>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Window */}
          <div className="lg:col-span-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50 overflow-hidden flex flex-col h-[650px]">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/50 to-white/50 dark:from-slate-800/50 dark:to-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {isLoading ? 'AI is thinking...' : 'AI Assistant Online'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    {message.role !== 'user' && (
                      <div className={`shrink-0 size-10 rounded-xl flex items-center justify-center shadow-lg ${
                        message.role === 'system'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/30'
                          : 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-500/30'
                      }`}>
                        <span className="material-symbols-outlined text-white text-lg">
                          {message.role === 'system' ? 'info' : 'smart_toy'}
                        </span>
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="shrink-0 size-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <span className="material-symbols-outlined text-white text-lg">person</span>
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`relative ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-md shadow-lg shadow-blue-500/20'
                        : message.role === 'system'
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl rounded-tl-md border border-indigo-100 dark:border-indigo-800/50'
                        : 'bg-white dark:bg-slate-700 rounded-2xl rounded-tl-md shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100 dark:border-slate-600'
                    } p-4`}>
                      {/* Source Badge */}
                      {message.source === 'live_web_search' && message.role !== 'user' && (
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-blue-500/30">
                          <span className="material-symbols-outlined text-xs">public</span>
                          Web Search
                        </div>
                      )}
                      
                      {/* Role Label */}
                      {message.role !== 'user' && (
                        <p className={`text-xs font-bold uppercase mb-2 ${
                          message.role === 'system' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {message.role === 'system' ? 'System' : 'AI Assistant'}
                        </p>
                      )}
                      
                      {/* Content */}
                      {message.isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="size-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="size-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="size-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-sm opacity-70">{message.content}</span>
                        </div>
                      ) : (
                        <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                          message.role === 'user' ? '' : 'text-slate-700 dark:text-slate-200'
                        }`}>{message.content}</p>
                      )}
                      
                      {/* Timestamp */}
                      <p className={`text-xs mt-3 ${
                        message.role === 'user' ? 'text-white/60' : 'text-slate-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-xl">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={useLiveSearch 
                      ? "Ask anything - I'll search the web for real-time info..." 
                      : "Ask about banking, feedback, loans, or system insights..."
                    }
                    className="w-full px-5 py-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-600 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                    rows={2}
                  />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2">
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      Enter to send
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all flex items-center gap-2 group"
                >
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    {isLoading ? 'hourglass_empty' : 'send'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-white/50 dark:border-slate-700/50 p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <div className="size-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <span className="material-symbols-outlined text-white text-sm">bolt</span>
                </div>
                Quick Actions
              </h3>
              <div className="space-y-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickAction(action)}
                    className="w-full text-left p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all flex items-center gap-3 group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                  >
                    <span className="flex-1 font-medium">{action.label}</span>
                    {action.needsLive && (
                      <span className="material-symbols-outlined text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">public</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-indigo-200/50 dark:border-indigo-800/50 p-5">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                <div className="size-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
                </div>
                Capabilities
              </h3>
              <ul className="space-y-3">
                {[
                  { text: 'Answer banking queries' },
                  { text: 'Fetch live RBI rates & news' },
                  { text: 'Explain loan concepts' },
                  { text: 'KYC & compliance guidance' },
                  { text: 'Explain policies & regulations' },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <div className="size-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex items-center justify-center">
                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xs">check</span>
                    </div>
                    {item.text}
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  For feedback analysis, use the Feedback section
                </p>
              </div>
            </div>

            {/* Model Info */}
            <div className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-5 text-center border border-slate-200/50 dark:border-slate-600/50">
              <div className="size-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="material-symbols-outlined text-white">memory</span>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Powered By</p>
              <p className="text-lg font-black mt-1 bg-gradient-to-r from-slate-700 to-slate-500 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Ollama + LangChain
              </p>
              <p className="text-xs text-slate-500 mt-1">Local AI with Web Search</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
