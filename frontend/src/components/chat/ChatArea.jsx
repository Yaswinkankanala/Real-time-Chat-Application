import React, { useRef, useEffect, useState } from 'react';
import {
  Hash,
  Sparkles,
  Bot,
  MessageSquare,
  X,
  PanelRight,
  UserPlus,
  Lock,
  Globe
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import FindPeopleModal from './FindPeopleModal';

export default function ChatArea({ onOpenAiDrawer, onToggleRightSidebar, isRightSidebarOpen }) {
  const {
    activeTarget,
    messages,
    loadingMessages,
    typingUsers,
    onlineUserIds
  } = useSocket();

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [isFindPeopleOpen, setIsFindPeopleOpen] = useState(false);

  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleGenerateSummary = async () => {
    if (!activeTarget) return;
    setSummarizing(true);
    setSummaryModalOpen(true);
    setSummaryText('');

    try {
      const payload =
        activeTarget.type === 'channel'
          ? { channelId: activeTarget.id }
          : { targetUserId: activeTarget.id };

      const { summary } = await api.summarizeChat(payload);
      setSummaryText(summary);
    } catch (err) {
      setSummaryText('Failed to generate summary: ' + err.message);
    } finally {
      setSummarizing(false);
    }
  };

  // Empty state when no chat selected or no conversations
  if (!activeTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/60 select-none">
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-bounce-short">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-2">No conversations yet</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          Find someone and start chatting, or jump into a public channel to connect with the team.
        </p>
        <button
          type="button"
          onClick={() => setIsFindPeopleOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Find People</span>
        </button>

        <FindPeopleModal
          isOpen={isFindPeopleOpen}
          onClose={() => setIsFindPeopleOpen(false)}
        />
      </div>
    );
  }

  const isChannel = activeTarget.type === 'channel';
  const isDirect = activeTarget.type === 'direct';
  const isTargetOnline = isDirect && onlineUserIds.includes(activeTarget.id);
  const isAiAgentTarget = isDirect && activeTarget.id === 'usr_nova_ai';

  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative min-w-0">
      {/* Top Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {isChannel ? (
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
              {activeTarget.details?.isPrivate ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Hash className="w-4 h-4 text-indigo-400" />
              )}
            </div>
          ) : (
            <div className="relative shrink-0">
              <img
                src={activeTarget.details?.avatar}
                alt={activeTarget.details?.displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-800"
              />
              {(isTargetOnline || isAiAgentTarget) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
              )}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <span>{isChannel ? `#${activeTarget.details?.name}` : activeTarget.details?.displayName}</span>
              {isAiAgentTarget && (
                <span className="px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Nova AI
                </span>
              )}
              {isChannel && activeTarget.details?.isPrivate && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                  Private
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {isChannel
                ? activeTarget.details?.description || 'Team channel'
                : isTargetOnline || isAiAgentTarget
                  ? 'Active in ChatSphere'
                  : 'Offline'}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* AI Summarize Button */}
          <button
            type="button"
            onClick={handleGenerateSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700/60 transition group"
            title="Summarize conversation with Nova AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
            <span className="hidden md:inline">AI Summary</span>
          </button>

          {/* Dedicated Nova AI Copilot drawer opener */}
          <button
            type="button"
            onClick={onOpenAiDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition shadow-sm"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">Nova AI</span>
          </button>

          {/* Toggle Right Details Sidebar */}
          <button
            type="button"
            onClick={onToggleRightSidebar}
            className={`p-2 rounded-xl border transition ${isRightSidebarOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white border-slate-700'
              }`}
            title="Toggle details sidebar"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No messages here yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Say hello, share code snippets, or tag <span className="text-indigo-400">@Nova</span> for instant AI assistance.
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-6 py-1.5 text-xs text-slate-400 flex items-center gap-2 bg-slate-950/20">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
          </div>
          <span>
            {typingNames.length === 1
              ? `${typingNames[0]} is typing...`
              : `${typingNames.slice(0, 2).join(', ')} and others are typing...`}
          </span>
        </div>
      )}

      {/* Input */}
      <MessageInput />

      {/* AI Summary Modal */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Nova AI • Conversation Summary</h3>
              </div>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {summarizing ? (
                <div className="flex items-center justify-center gap-3 py-12 text-slate-400 text-xs">
                  <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Nova AI is analyzing chat history and extracting takeaways...</span>
                </div>
              ) : (
                summaryText
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSummaryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
