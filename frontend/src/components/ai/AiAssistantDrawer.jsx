import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  FileText,
  Code,
  Lightbulb,
  Copy,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export default function AiAssistantDrawer({ isOpen, onClose }) {
  const { activeTarget, messages: currentChatMessages } = useSocket();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "👋 Hi! I'm **Nova AI**, your autonomous intelligence assistant in **ChatSphere**.\n\nAsk me anything, or tap one of the quick actions below to summarize channels, generate code, or draft messages!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (customText = null) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setPrompt('');
    setLoading(true);

    try {
      const context = currentChatMessages
        .slice(-10)
        .map((m) => `${m.sender?.displayName || m.senderId}: ${m.content}`)
        .join('\n');

      const res = await api.askAi(textToSend, context);

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.reply,
        hasLiveGemini: res.hasLiveGemini,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: `⚠️ Nova AI communication error: ${err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeChannel = async () => {
    if (!activeTarget) {
      handleSend("Please summarize our overall project goals and discussions.");
      return;
    }
    const targetLabel = activeTarget.type === 'channel' ? `#${activeTarget.details.name}` : `Chat with ${activeTarget.details.displayName}`;
    handleSend(`Please provide a bulleted summary of recent messages in ${targetLabel}.`);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl backdrop-blur-2xl flex flex-col animate-fade-in select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Sparkles className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Nova AI Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </h3>
            <p className="text-[11px] text-slate-400">ChatSphere Intelligence</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Chips */}
      <div className="p-2.5 border-b border-slate-800/60 bg-slate-950/20 flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
        <button
          onClick={handleSummarizeChannel}
          disabled={loading}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Summarize</span>
        </button>
        <button
          onClick={() => handleSend("Explain how ChatSphere channel passcodes and Socket.IO rooms work.")}
          disabled={loading}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition"
        >
          <Code className="w-3.5 h-3.5 text-purple-400" />
          <span>Architecture</span>
        </button>
        <button
          onClick={() => handleSend("Draft a polite follow-up message for my team.")}
          disabled={loading}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Draft Message</span>
        </button>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 select-text">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed relative group ${m.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-xs'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                }`}
            >
              {m.sender === 'ai' && (
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-700/50 text-[10px] text-indigo-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Bot className="w-3 h-3" /> Nova AI
                  </span>
                  <button
                    onClick={() => copyToClipboard(m.text, m.id)}
                    className="text-slate-400 hover:text-white"
                    title="Copy text"
                  >
                    {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{m.time}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 max-w-[80%] rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Nova AI is thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Nova AI anything..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
