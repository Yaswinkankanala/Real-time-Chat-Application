import React, { useRef, useEffect } from 'react';
import {
  Hash,
  Lock,
  Globe,
  MessageSquare,
  PanelRight,
  UserPlus,
  AlertCircle,
  Clock,
  WifiOff
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';
import FindPeopleModal from './FindPeopleModal';

export default function ChatArea({ onToggleRightSidebar, isRightSidebarOpen }) {
  const {
    activeTarget,
    messages,
    loadingMessages,
    typingUsers,
    onlineUserIds,
    offlineNotice,
    setOfflineNotice
  } = useSocket();

  const [isFindPeopleOpen, setIsFindPeopleOpen] = React.useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  // Empty state when no chat is active
  if (!activeTarget) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-950/60 select-none transition-colors">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 animate-bounce-short">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">
          No conversations yet
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Find your friends using their unique identification code or phone number, or join the Vignan channel to start communicating.
        </p>
        <button
          type="button"
          onClick={() => setIsFindPeopleOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Find Friends</span>
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
  const typingNames = Object.values(typingUsers);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 relative min-w-0 transition-colors">
      {/* Top Header */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
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
                src={
                  activeTarget.details?.avatar ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(activeTarget.details?.displayName || 'User')}`
                }
                alt={activeTarget.details?.displayName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-800"
              />
              {isTargetOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
              <span>{isChannel ? `#${activeTarget.details?.name}` : activeTarget.details?.displayName}</span>
              {isChannel && activeTarget.details?.isPrivate && (
                <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">
                  Private
                </span>
              )}
              {isDirect && activeTarget.details?.uniqueCode && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold">
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

        {/* Header Right Action: Toggle details sidebar */}
        <div className="flex items-center gap-2">
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
    </div>
  );
}
