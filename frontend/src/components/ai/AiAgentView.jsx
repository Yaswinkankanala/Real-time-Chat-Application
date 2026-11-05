import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Bot,
  User,
  AlertCircle,
  Lightbulb,
  Code,
  PenTool,
  Compass,
  MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

const SUGGESTION_PROMPTS = [
  {
    icon: Code,
    title: 'Explain WebSockets',
    prompt: 'Explain how WebSockets work compared to traditional HTTP polling in real-time chat apps.'
  },
  {
    icon: Lightbulb,
    title: 'Project Ideas',
    prompt: 'Suggest 5 innovative and unique features for a real-time team collaboration app.'
  },
  {
    icon: PenTool,
    title: 'Draft a Message',
    prompt: 'Help me write a concise, professional message to my team announcing a project milestone.'
  },
  {
    icon: Compass,
    title: 'Coding Assistance',
    prompt: 'Write a JavaScript function to format timestamps into relative time (e.g. "5m ago", "2h ago").'
  }
];

export default function AiAgentView({ onExit }) {
  const { user } = useAuth();
  const { exitActiveTarget } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingConvs, setFetchingConvs] = useState(true);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const dropdownRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Click outside to close history dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowHistoryDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch AI conversations on mount
  const loadConversations = async (autoSelectLatest = true) => {
    setFetchingConvs(true);
    try {
      const res = await api.getAiConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (autoSelectLatest && list.length > 0) {
        setActiveConvId(list[0].id);
        setMessages(list[0].messages || []);
      } else if (list.length === 0) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load AI conversations:', err);
    } finally {
      setFetchingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Switch conversation
  const handleSelectConversation = async (convId) => {
    setShowHistoryDropdown(false);
    setError('');
    setActiveConvId(convId);
    try {
      const res = await api.getAiConversationById(convId);
      if (res.conversation) {
        setMessages(res.conversation.messages || []);
      }
    } catch (err) {
      console.error('Failed to load selected conversation:', err);
      setError('Failed to load conversation history.');
    }
  };

  // Start a new conversation
  const handleStartNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setError('');
    setInputText('');
    setShowHistoryDropdown(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await api.deleteAiConversation(convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);

      if (activeConvId === convId) {
        if (updated.length > 0) {
          setActiveConvId(updated[0].id);
          setMessages(updated[0].messages || []);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete AI conversation:', err);
    }
  };

  // Send message to AI Agent
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setError('');
    setInputText('');

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.sendAiMessage(text, activeConvId);

      if (res.success && res.conversation) {
        // Set new active conversation ID if we started from blank
        if (!activeConvId || activeConvId !== res.conversationId) {
          setActiveConvId(res.conversationId);
          // Refresh conversation list in background
          loadConversations(false);
        }
        setMessages(res.conversation.messages || []);
      } else {
        throw new Error(res.error || 'Failed to receive AI response');
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setError(err.message || 'Failed to get a response from AI. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard events (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Copy AI response
  const handleCopyMessage = (index, content) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExitClick = () => {
    if (onExit) {
      onExit();
    } else {
      exitActiveTarget();
    }
  };

  const currentConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 relative min-w-0 transition-colors">
      {/* Top Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-4 h-4 animate-pulse-subtle" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                ChatSphere AI Assistant
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                Smart Agent
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {currentConv ? currentConv.title : 'Ready to help with code, ideas, and messages'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Conversation History Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
              title="View past AI conversations"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Conversations</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                {conversations.length}
              </span>
            </button>

            {showHistoryDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in transition-colors max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Past AI Chats
                  </span>
                  <button
                    type="button"
                    onClick={handleStartNewConversation}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Chat</span>
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No past AI conversations yet.
                  </div>
                ) : (
                  conversations.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectConversation(c.id)}
                      className={`group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                        c.id === activeConvId
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <p className="truncate text-xs">{c.title || 'Conversation'}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.messages?.length || 0} messages
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteConversation(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition rounded"
                        title="Delete AI conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleStartNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 font-bold text-xs shadow-sm transition active:scale-95"
            title="Start a new AI conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* EXIT BUTTON (Requirement for FEATURE 6) */}
          <button
            type="button"
            onClick={handleExitClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 font-bold text-xs shadow-sm transition active:scale-95"
            title="Exit AI Assistant and return to dashboard"
          >
            <LogOut className="w-3.5 h-3.5 rotate-180 text-rose-500" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          /* Empty / Welcome State */
          <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 py-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/25 animate-bounce-short">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                How can ChatSphere AI help you today?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                Ask technical questions, draft messages, generate ideas, or explain programming concepts. Your conversations are saved privately.
              </p>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2">
              {SUGGESTION_PROMPTS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-sm hover:shadow text-left transition-all group active:scale-98"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Messages List */
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed transition-all shadow-sm ${
                      isUser
                        ? 'bg-indigo-600 text-white font-medium rounded-tr-sm ml-auto'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm space-y-2'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Formatted Markdown-like rendering */}
                        <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed font-sans">
                          {msg.content}
                        </div>

                        {/* Copy button */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(index, msg.content)}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                            title="Copy AI response"
                          >
                            {copiedIndex === index ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="shrink-0 mt-1">
                      <img
                        src={resolveAvatarUrl(user?.avatar, user?.displayName)}
                        alt={user?.displayName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
                        onError={(e) => handleAvatarError(e, user?.displayName)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading / Thinking State */}
            {loading && (
              <div className="flex gap-3 animate-fade-in items-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-4 text-xs shadow-sm flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    ChatSphere AI is thinking
                  </span>
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSendMessage(inputText)}
                  className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 font-bold text-[11px] transition"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <div className="p-4 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 focus-within:border-indigo-500 transition-colors shadow-inner">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send, Shift + Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none max-h-32 min-h-[36px]"
            />

            <button
              type="button"
              disabled={!inputText.trim() || loading}
              onClick={() => handleSendMessage()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold transition shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
              title="Send to AI Assistant"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-slate-400">
            <span>Powered by Gemini & Intelligent ChatSphere Engine</span>
            <span>Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

