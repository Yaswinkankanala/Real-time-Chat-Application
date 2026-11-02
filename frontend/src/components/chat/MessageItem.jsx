import React, { useState } from 'react';
import { 
  SmilePlus, 
  Download, 
  ExternalLink, 
  FileCheck, 
  Sparkles,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const AVAILABLE_EMOJIS = ['👍', '❤️', '🔥', '🚀', '✨', '😂', '🎉'];

export default function MessageItem({ message }) {
  const { user } = useAuth();
  const { sendReaction } = useSocket();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwn = message.senderId === user?.id;
  const isAgent = message.sender?.isAgent || message.senderId === 'usr_nova_ai';

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
            <div key={index} className="my-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs overflow-x-auto text-emerald-400">
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
        return <strong key={i} className="font-semibold text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300 font-mono text-xs">
            {token.slice(1, -1)}
          </code>
        );
      }
      return token;
    });
  };

  return (
    <div className={`group flex gap-3 px-4 py-2 hover:bg-slate-900/40 rounded-2xl transition relative ${isAgent ? 'bg-indigo-950/20 border border-indigo-500/10' : ''}`}>
      {/* Sender Avatar */}
      <div className="shrink-0 relative">
        <img
          src={message.sender?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${message.senderId}`}
          alt={message.sender?.displayName || 'User'}
          className={`w-9 h-9 rounded-full object-cover ring-2 ${
            isAgent ? 'ring-indigo-500 shadow-md shadow-indigo-500/20' : 'ring-slate-800'
          }`}
        />
        {isAgent && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px]">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        )}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold truncate ${isAgent ? 'text-indigo-400 flex items-center gap-1.5' : 'text-slate-200'}`}>
            {message.sender?.displayName || message.sender?.username || 'User'}
            {isAgent && (
              <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold tracking-wide">
                NOVA AI
              </span>
            )}
          </span>
          <span className="text-[10px] text-slate-500">{formatTime(message.createdAt)}</span>

          {/* Message Status indicator (for own messages) */}
          {isOwn && (
            <span className="text-[11px] ml-1 flex items-center" title={`Status: ${message.status || 'sent'}`}>
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Check className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
          )}
        </div>

        {/* Text Content */}
        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
          {renderFormattedContent(message.content)}
        </div>

        {/* Attachment preview if present */}
        {message.attachment && (
          <div className="mt-2.5 max-w-sm">
            {message.attachment.mimetype?.startsWith('image/') ? (
              <a
                href={`http://localhost:5000${message.attachment.url}`}
                target="_blank"
                rel="noreferrer"
                className="block group/att relative rounded-xl overflow-hidden border border-slate-700/60 max-h-60"
              >
                <img
                  src={`http://localhost:5000${message.attachment.url}`}
                  alt={message.attachment.filename}
                  className="w-full h-full object-cover group-hover/att:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center text-white text-xs gap-1">
                  <ExternalLink className="w-4 h-4" /> Open Image
                </div>
              </a>
            ) : (
              <a
                href={`http://localhost:5000${message.attachment.url}`}
                download={message.attachment.filename}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 truncate">{message.attachment.filename}</p>
                  <p className="text-[10px] text-slate-500">{(message.attachment.size / 1024).toFixed(1)} KB</p>
                </div>
                <Download className="w-4 h-4 text-slate-400 hover:text-white" />
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
                      ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-800/60 hover:bg-slate-800 border border-slate-700/40 text-slate-300'
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
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
            title="Add reaction"
          >
            <SmilePlus className="w-4 h-4" />
          </button>

          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute right-0 bottom-full mb-1 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl flex gap-1 z-20 animate-fade-in">
              {AVAILABLE_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 rounded-lg text-base transition hover:scale-125"
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
