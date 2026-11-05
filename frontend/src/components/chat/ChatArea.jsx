import React, { useRef, useEffect, useState } from 'react';
import {
  Hash,
  Lock,
  Globe,
  MessageSquare,
  PanelRight,
  UserPlus,
  AlertCircle,
  Clock,
  WifiOff,
  Sparkles,
  LogOut,
  Bot,
  Compass,
  ArrowLeft
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import FindPeopleModal from './FindPeopleModal';
import AiChatSummaryModal from './AiChatSummaryModal';
import AiAgentView from '../ai/AiAgentView';
import ChatSphere3DHero from '../common/ChatSphere3DHero';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

export default function ChatArea({ onToggleRightSidebar, isRightSidebarOpen }) {
  const {
    activeTarget,
    messages,
    loadingMessages,
    typingUsers,
    onlineUserIds,
    offlineNotice,
    setOfflineNotice,
    selectTarget,
    exitActiveTarget
  } = useSocket();

  const [isFindPeopleOpen, setIsFindPeopleOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Close AI summary modal whenever target conversation changes
  useEffect(() => {
    setIsSummaryOpen(false);
  }, [activeTarget?.id, activeTarget?.type]);

  // Handle Exit Button click for opened chat/channel
  const handleExit = () => {
    setIsSummaryOpen(false);
    exitActiveTarget();
  };

  // Render dedicated AI Agent Interface when activeTarget is 'ai'
  if (activeTarget?.type === 'ai') {
    return <AiAgentView onExit={handleExit} />;
  }

  // Dashboard / Empty state when no chat or channel is currently open
  if (!activeTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-white dark:bg-slate-950/60 select-none transition-colors overflow-y-auto">
        <div className="mb-4">
          <ChatSphere3DHero size="default" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          ChatSphere Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Select a conversation from the sidebar, search for friends using their Unique Code or Phone, or explore ChatSphere AI.
        </p>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full mb-6 text-left">
          <button
            type="button"
            onClick={() => setIsFindPeopleOpen(true)}
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition flex items-center gap-3 group active:scale-98 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Find Friends
              </p>
              <p className="text-[10px] text-slate-400">Search by code or phone</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectTarget('ai', 'assistant', { name: 'ChatSphere AI Assistant' })}
            className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 transition flex items-center gap-3 group active:scale-98 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 animate-pulse-subtle" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                AI Assistant
              </p>
              <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400">Code, ideas, & messages</p>
            </div>
          </button>
        </div>

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
  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 relative min-w-0 transition-colors">
      {/* Top Header */}
      <div className="h-16 px-3 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Back Button: return to sidebar list immediately */}
          <button
            type="button"
            onClick={handleExit}
            className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            title="Back to conversation list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {isChannel ? (
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shrink-0">
              {activeTarget.details?.isPrivate ? (
                <Lock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              ) : (
                <Hash className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>
          ) : (
            <div className="relative shrink-0">
              <img
                src={resolveAvatarUrl(activeTarget.details?.avatar, activeTarget.details?.displayName)}
                alt={activeTarget.details?.displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-800"
                onError={(e) => handleAvatarError(e, activeTarget.details?.displayName)}
              />
              {isTargetOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
              <span className="truncate">{isChannel ? `#${activeTarget.details?.name}` : activeTarget.details?.displayName}</span>
              {isChannel && activeTarget.details?.isPrivate && (
                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold shrink-0">
                  Private
                </span>
              )}
              {isDirect && activeTarget.details?.uniqueCode && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold shrink-0">
                  {activeTarget.details.uniqueCode}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {isChannel
                ? activeTarget.details?.description || 'Channel conversation'
                : isTargetOnline
                  ? 'Online'
                  : 'Offline'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Chat Summary: Exclusively for 1-to-1 Personal Conversations (FEATURE 2) */}
          {isDirect && (
            <button
              type="button"
              onClick={() => setIsSummaryOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 font-bold text-xs shadow-sm transition active:scale-95"
              title="Summarize this 1-to-1 conversation with AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">AI Summary</span>
            </button>
          )}

          {/* Toggle Details Sidebar */}
          <button
            type="button"
            onClick={onToggleRightSidebar}
            className={`p-2 rounded-xl border transition ${
              isRightSidebarOpen
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle details sidebar"
          >
            <PanelRight className="w-4 h-4" />
          </button>

          {/* EXIT BUTTON: Available for both Personal 1-to-1 Chats and Channels (FEATURE 6) */}
          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 font-bold text-xs shadow-sm transition active:scale-95"
            title={isChannel ? 'Exit channel' : 'Exit chat'}
          >
            <LogOut className="w-3.5 h-3.5 rotate-180 text-rose-500" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Offline Recipient Notice Banner */}
      {offlineNotice && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium">{offlineNotice}</span>
          </div>
          <button
            onClick={() => setOfflineNotice(null)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 font-bold text-sm ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
        {loadingMessages ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800/50 flex items-center justify-center text-slate-400 mb-3 shadow-sm border border-slate-200 dark:border-slate-800">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No messages yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Send a message to start communicating in real time!
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}
      </div>

      {/* Typing indicator */}
      {typingNames.length > 0 && (
        <div className="px-6 py-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 bg-slate-100/50 dark:bg-slate-950/20">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>
            {typingNames.length === 1
              ? `${typingNames[0]} is typing...`
              : `${typingNames.slice(0, 2).join(', ')} are typing...`}
          </span>
        </div>
      )}

      {/* Input */}
      <MessageInput />

      {/* AI Chat Summary Modal (1-to-1 Personal Chats ONLY) */}
      <AiChatSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        targetUser={isDirect ? activeTarget.details : null}
      />
    </div>
  );
}
