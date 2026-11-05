import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { resolveAvatarUrl } from '../../utils/avatar';

const QUICK_EMOJIS = ['😊', '😂', '🔥', '🚀', '👍', '❤️', '🎉', '💯', '👏', '✨'];

export default function MessageInput() {
  const { sendMessage, sendTypingStatus, activeTarget } = useSocket();
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

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

  const handleSend = async () => {
    if ((!content.trim() && !attachment) || uploading) return;

    const textToSend = content.trim();
    const currentAttachment = attachment;

    setContent('');
    setAttachment(null);
    setShowEmojis(false);

    if (isTypingRef.current) {
      sendTypingStatus(false);
      isTypingRef.current = false;
    }

    try {
      await sendMessage({
        content: textToSend,
        attachment: currentAttachment
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      alert('Could not deliver message: ' + err.message);
    }
  };

  const addEmoji = (emoji) => {
    setContent((prev) => prev + emoji);
    setShowEmojis(false);
  };

  return (
    <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 transition-colors select-none shrink-0">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2 truncate">
            {attachment.mimetype?.startsWith('image/') ? (
              <img
                src={resolveAvatarUrl(attachment.url)}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-lg"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                FILE
              </div>
            )}
            <div className="truncate">
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {attachment.filename}
              </p>
              <p className="text-[10px] text-slate-400">
                {(attachment.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojis && (
        <div className="mb-2 p-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl flex flex-wrap gap-1.5 animate-fade-in max-w-xs">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="text-lg p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input controls bar */}
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 focus-within:border-indigo-500 transition-colors">
        {/* Attachment button */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
          title="Attach photo or document"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
        </button>

        {/* Emoji trigger */}
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition"
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
              ? `Message #${activeTarget.details?.name}...`
              : `Message ${activeTarget?.details?.displayName}...`
          }
          className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none resize-none py-1.5 px-2 max-h-28"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!content.trim() && !attachment) || uploading}
          className={`p-2.5 rounded-xl transition ${
            content.trim() || attachment
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500'
              : 'text-slate-400 cursor-not-allowed opacity-50'
          }`}
          title="Send message (Enter)"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
