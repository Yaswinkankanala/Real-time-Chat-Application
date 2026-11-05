import React, { useState } from 'react';
import {
  SmilePlus,
  Download,
  ExternalLink,
  FileCheck,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

const AVAILABLE_EMOJIS = ['👍', '❤️', '🔥', '🚀', '✨', '😂', '🎉', '👏'];

function resolveAttachmentUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  let backendUrl = '';
  try {
    backendUrl = localStorage.getItem('chatsphere_backend_url') || import.meta.env.VITE_API_URL || '';
  } catch (e) {}

  if (backendUrl) {
    const clean = backendUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    return `${clean}${url}`;
  }

  return url;
}

export default function MessageItem({ message }) {
  const { user } = useAuth();
  const { sendReaction } = useSocket();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwn = message.senderId === user?.id;

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleReact = (emoji) => {
    sendReaction(message.id, emoji);
    setShowEmojiPicker(false);
  };

  // Render markdown-like simple formatting for code and bold
  const renderFormattedContent = (content) => {
    if (!content) return null;

    if (content.includes('```')) {
      const parts = content.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^[a-z]+\n/i, '');
          return (
            <div
              key={index}
              className="my-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 font-mono text-xs overflow-x-auto text-emerald-600 dark:text-emerald-400"
            >
              <pre>{code}</pre>
            </div>
          );
        }
        return <span key={index}>{renderInlineStyles(part)}</span>;
      });
    }

    return renderInlineStyles(content);
  };

  const renderInlineStyles = (text) => {
    const tokens = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return tokens.map((token, i) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800/80 text-indigo-700 dark:text-amber-300 font-mono text-xs"
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className="group flex gap-3 px-3 sm:px-4 py-2 hover:bg-slate-100/60 dark:hover:bg-slate-900/40 rounded-2xl transition relative">
      {/* Sender Avatar */}
      <div className="shrink-0 relative">
        <img
          src={resolveAvatarUrl(message.sender?.avatar, message.sender?.displayName || message.sender?.username)}
          alt={message.sender?.displayName || 'User'}
          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800"
          onError={(e) => handleAvatarError(e, message.sender?.displayName || message.sender?.username)}
        />
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
            {message.sender?.displayName || message.sender?.username || 'User'}
          </span>
          {message.sender?.uniqueCode && (
            <span className="font-mono text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold">
              {message.sender.uniqueCode}
            </span>
          )}
          <span className="text-[10px] text-slate-400">{formatTime(message.createdAt)}</span>

          {/* Message Status indicator (for own messages) */}
          {isOwn && (
            <span className="text-[11px] ml-0.5 flex items-center" title={`Status: ${message.status || 'sent'}`}>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>

        {/* Text Content */}
        {message.content && (
          <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
            {renderFormattedContent(message.content)}
          </div>
        )}

        {/* Attachment preview if present */}
        {message.attachment && (
          <div className="mt-2.5 max-w-sm">
            {message.attachment.mimetype?.startsWith('image/') ? (
              <a
                href={resolveAttachmentUrl(message.attachment.url)}
                target="_blank"
                rel="noreferrer"
                className="block group/att relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/60 max-h-64 bg-slate-100 dark:bg-slate-900"
              >
                <img
                  src={resolveAttachmentUrl(message.attachment.url)}
                  alt={message.attachment.filename}
                  className="w-full h-full object-cover group-hover/att:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center text-white text-xs gap-1 font-semibold">
                  <ExternalLink className="w-4 h-4" /> Open Full Image
                </div>
              </a>
            ) : (
              <a
                href={resolveAttachmentUrl(message.attachment.url)}
                download={message.attachment.filename}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">
                    {message.attachment.filename}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(message.attachment.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400 hover:text-indigo-500 transition" />
              </a>
            )}
          </div>
        )}

        {/* Reactions List */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(message.reactions).map(([emoji, userList]) => {
              const hasReacted = userList.includes(user?.id);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition ${
                    hasReacted
                      ? 'bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-300 dark:border-indigo-500/50 text-indigo-600 dark:text-indigo-200'
                      : 'bg-white dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-semibold text-[11px]">{userList.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Hover Actions (Reaction button) */}
      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition shadow-sm"
            title="Add reaction"
          >
            <SmilePlus className="w-4 h-4" />
          </button>

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute right-0 bottom-full mb-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex gap-1 z-20 animate-fade-in">
              {AVAILABLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-base transition hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
