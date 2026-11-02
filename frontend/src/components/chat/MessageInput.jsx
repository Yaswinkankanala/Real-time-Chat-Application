import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Sparkles,
  X,
  Image as ImageIcon,
  Zap
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';

const QUICK_EMOJIS = ['😊', '😂', '🔥', '🚀', '👍', '❤️', '🎉', '💯', '🤖', '✨'];

export default function MessageInput() {
  const { sendMessage, sendTypingStatus, activeTarget, messages } = useSocket();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [smartReplies, setSmartReplies] = useState([]);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Generate Smart Replies when latest message is received
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && !lastMsg.isOwn && lastMsg.content) {
        api.getSmartReplies(lastMsg.content)
          .then((res) => setSmartReplies(res.suggestions || []))
          .catch(() => setSmartReplies([]));
      } else {
        setSmartReplies([]);
      }
    } else {
      setSmartReplies([]);
    }
  }, [messages]);

  // Stop typing on channel switch
  useEffect(() => {
    setContent('');
    setAttachment(null);
    setShowEmojis(false);
    if (isTypingRef.current) {
      sendTypingStatus(false);
      isTypingRef.current = false;
    }
  }, [activeTarget?.id]);

  const handleInputChange = (e) => {
    setContent(e.target.value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await api.uploadFile(file);
      setAttachment(data);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload attachment: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (overrideContent = null) => {
    const textToSend = overrideContent !== null ? overrideContent : content;
    if ((!textToSend.trim() && !attachment) || uploading) return;

    const payload = {
      content: textToSend.trim(),
      attachment: attachment || null
    };

    setContent('');
    setAttachment(null);
    setShowEmojis(false);
    setSmartReplies([]);

    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingStatus(false);
    }

    try {
      await sendMessage(payload);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const insertTag = (tag) => {
    setContent((prev) => (prev ? `${prev} ${tag} ` : `${tag} `));
  };

  return (
    <div className="p-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-xl relative">
      {/* Smart Reply suggestion chips */}
      {smartReplies.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto text-xs no-scrollbar animate-fade-in">
          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 shrink-0 px-1">
            <Zap className="w-3 h-3" /> Smart Replies:
          </span>
          {smartReplies.map((reply, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(reply)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition active:scale-95"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Quick Tag Pill */}
      <div className="flex items-center gap-2 mb-2 px-1 text-xs">
        <span className="text-slate-500 text-[11px]">Chat Assistant:</span>
        <button
          type="button"
          onClick={() => insertTag('@Nova')}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition text-[11px]"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>Ask @Nova AI</span>
        </button>
      </div>

      {/* Attachment Preview Chip */}
      {attachment && (
        <div className="mb-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between max-w-xs animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <ImageIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-200 truncate">{attachment.filename}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Tray */}
      {showEmojis && (
        <div className="absolute bottom-full mb-2 left-4 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-wrap gap-1 max-w-xs z-30 animate-fade-in">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setContent((prev) => prev + emoji);
              }}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg text-lg transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="flex items-end gap-2 bg-slate-950/80 rounded-2xl border border-slate-800/90 p-1.5 focus-within:border-indigo-500/80 transition-colors">
        {/* Attachment Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition disabled:opacity-50"
          title="Upload image or file"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block"></span>
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
          title="Insert emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <textarea
          rows={1}
          value={content}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            activeTarget?.type === 'channel'
              ? `Message #${activeTarget.details?.name || 'channel'}... (type @Nova to ask AI)`
              : `Message ${activeTarget?.details?.displayName || 'user'}...`
          }
          className="flex-1 bg-transparent py-2 px-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px]"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={(!content.trim() && !attachment) || uploading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-40 disabled:hover:bg-indigo-600"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
