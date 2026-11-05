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
import { getBackendHost } from '../../services/api';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

const AVAILABLE_EMOJIS = ['👍', '❤️', '🔥', '🚀', '✨', '😂', '🎉', '👏'];

function resolveAttachmentUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const host = getBackendHost();
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${host}${cleanUrl}`;
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
              className={`my-2 p-2.5 rounded-xl font-mono text-xs overflow-x-auto ${
                isOwn
                  ? 'bg-indigo-950/40 border border-white/10 text-emerald-200'
                  : 'bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400'
              }`}
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
          <strong
            key={i}
            className={`font-bold ${isOwn ? 'text-white' : 'text-slate-900 dark:text-white'}`}
          >
            {token.slice(2, -2)}
          </strong>
        );
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded font-mono text-xs ${
              isOwn
                ? 'bg-white/20 text-white'
                : 'bg-slate-200/80 dark:bg-slate-800/80 text-indigo-700 dark:text-amber-300'
            }`}
          >
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div
      className={`group flex px-3 sm:px-6 py-1.5 transition-colors relative ${
        isOwn ? 'justify-end' : 'justify-start'
      }`}
    >
      <div className={`flex gap-2.5 max-w-[88%] sm:max-w-[75%] md:max-w-[65%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Recipient Avatar (only for incoming messages) */}
        {!isOwn && (
          <div className="shrink-0 relative self-end mb-1">
            <img
              src={resolveAvatarUrl(message.sender?.avatar, message.sender?.displayName || message.sender?.username)}
              alt={message.sender?.displayName || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm"
              onError={(e) => handleAvatarError(e, message.sender?.displayName || message.sender?.username)}
            />
          </div>
        )}

        {/* Message Bubble Container */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Sender Header for received messages */}
          {!isOwn && (
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">
                {message.sender?.displayName || message.sender?.username || 'User'}
              </span>
              {message.sender?.uniqueCode && (
                <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/60 dark:border-indigo-800/50">
                  {message.sender.uniqueCode}
                </span>
              )}
            </div>
          )}

          {/* Actual Chat Bubble */}
          <div
            className={`relative px-4 py-2.5 rounded-2xl shadow-sm transition-all text-xs sm:text-sm leading-relaxed ${
              isOwn
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-br-xs shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-xs'
            }`}
          >
            {/* Text Message Content */}
            {message.content && (
              <div className="whitespace-pre-wrap break-words">
                {renderFormattedContent(message.content)}
              </div>
            )}

            {/* Attachment preview if present */}
            {message.attachment && (
              <div className="mt-2 max-w-sm">
                {message.attachment.mimetype?.startsWith('image/') ? (
                  <a
                    href={resolveAttachmentUrl(message.attachment.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="block group/att relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-h-60 bg-black/10"
                  >
                    <img
                      src={resolveAttachmentUrl(message.attachment.url)}
                      alt={message.attachment.filename}
                      className="w-full h-full object-cover group-hover/att:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center text-white text-xs gap-1 font-semibold">
                      <ExternalLink className="w-3.5 h-3.5" /> Full Image
                    </div>
                  </a>
                ) : (
                  <a
                    href={resolveAttachmentUrl(message.attachment.url)}
                    download={message.attachment.filename}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition shadow-xs ${
                      isOwn
                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isOwn ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {message.attachment.filename}
                      </p>
                      <p className={`text-[10px] ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
                        {(message.attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Download className={`w-3.5 h-3.5 ${isOwn ? 'text-white/80' : 'text-slate-400'}`} />
                  </a>
                )}
              </div>
            )}

            {/* Bubble Footer: Timestamp & Read Status */}
            <div
              className={`flex items-center gap-1 mt-1 text-[10px] select-none ${
                isOwn ? 'justify-end text-white/75' : 'justify-end text-slate-400'
              }`}
            >
              <span>{formatTime(message.createdAt)}</span>
              {isOwn && (
                <span className="flex items-center ml-0.5" title={`Status: ${message.status || 'sent'}`}>
                  {message.status === 'read' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                  ) : message.status === 'delivered' ? (
                    <CheckCheck className="w-3.5 h-3.5 text-white/80" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-white/70" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Reactions List */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(message.reactions).map(([emoji, userList]) => {
                const hasReacted = userList.includes(user?.id);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition ${
                      hasReacted
                        ? 'bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-200 font-bold'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="font-semibold text-[10px]">{userList.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reaction Trigger Button (Hover or Touch on Mobile) */}
        <div
          className={`self-center opacity-0 group-hover:opacity-100 transition-opacity ${
            isOwn ? 'order-first' : 'order-last'
          }`}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition shadow-xs"
              title="Add reaction"
            >
              <SmilePlus className="w-3.5 h-3.5" />
            </button>

            {/* Emoji Popover */}
            {showEmojiPicker && (
              <div
                className={`absolute bottom-full mb-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl flex gap-1 z-30 animate-fade-in ${
                  isOwn ? 'right-0' : 'left-0'
                }`}
              >
                {AVAILABLE_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleReact(emoji)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm transition hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
