import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Tag,
  Lock,
  Globe,
  Key,
  Copy,
  Check,
  Users,
  LogOut,
  Trash2,
  Image as ImageIcon,
  FileText,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

export default function RightDetailsSidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeTarget, messages } = useSocket();

  const [channelDetails, setChannelDetails] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedUserCode, setCopiedUserCode] = useState(false);

  useEffect(() => {
    if (activeTarget?.type === 'channel') {
      api.getChannelDetails(activeTarget.id)
        .then((res) => setChannelDetails(res.channel))
        .catch(() => setChannelDetails(null));
    }
  }, [activeTarget]);

  if (!isOpen || !activeTarget) return null;

  const isChannel = activeTarget.type === 'channel';
  const isDirect = activeTarget.type === 'direct';
  const targetUser = activeTarget.details;

  // Filter shared media from message stream
  const sharedMedia = messages.filter((m) => m.attachment);

  const copyPasscode = () => {
    const code = channelDetails?.passcode || activeTarget.details?.passcode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyTargetUserCode = () => {
    if (targetUser?.uniqueCode) {
      navigator.clipboard.writeText(targetUser.uniqueCode);
      setCopiedUserCode(true);
      setTimeout(() => setCopiedUserCode(false), 2000);
    }
  };

  const handleLeaveChannel = async () => {
    if (!confirm('Are you sure you want to leave this channel?')) return;
    try {
      await api.leaveChannel(activeTarget.id);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteChannel = async () => {
    if (!confirm('Are you sure you want to permanently delete this channel?')) return;
    try {
      await api.deleteChannel(activeTarget.id);
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <aside className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 animate-fade-in select-none transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {isChannel ? 'Channel Info' : 'Contact Profile'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Profile Card Header */}
        <div className="text-center p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <div className="relative inline-block mb-3">
            {isChannel ? (
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 mx-auto">
                {activeTarget.details?.isPrivate ? (
                  <Lock className="w-8 h-8 text-amber-500" />
                ) : (
                  <Hash className="w-8 h-8 text-indigo-500" />
                )}
              </div>
            ) : (
              <img
                src={resolveAvatarUrl(targetUser?.avatar, targetUser?.displayName)}
                alt={targetUser?.displayName}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500/30 mx-auto"
                onError={(e) => handleAvatarError(e, targetUser?.displayName)}
              />
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {isChannel ? `#${activeTarget.details?.name}` : targetUser?.displayName}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {isChannel
              ? activeTarget.details?.description || 'Community channel'
              : `@${targetUser?.username}`}
          </p>

          {/* User's Permanent Unique Identification Code */}
          {isDirect && targetUser?.uniqueCode && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30">
              <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                {targetUser.uniqueCode}
              </span>
              <button
                type="button"
                onClick={copyTargetUserCode}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
                title="Copy friend's code"
              >
                {copiedUserCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Contact Details (For 1-to-1 chats) */}
        {isDirect && targetUser && (
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              About
            </h5>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              {targetUser.mobileNumber && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-mono">{targetUser.mobileNumber}</span>
                </div>
              )}
              {targetUser.gender && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>{targetUser.gender}</span>
                </div>
              )}
              {targetUser.bio && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60 leading-relaxed">
                  {targetUser.bio}
                </p>
              )}
            </div>

            {/* Interests Chips */}
            {Array.isArray(targetUser.interests) && targetUser.interests.length > 0 && (
              <div>
                <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 mb-2">
                  Interests
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {targetUser.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200 dark:border-indigo-500/30"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Channel Management Section (For channels) */}
        {isChannel && channelDetails && (
          <div className="space-y-3">
            {/* Passcode (Only visible to owner or creator) */}
            {channelDetails.isPrivate && channelDetails.passcode && (
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                  Channel Passcode
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-extrabold text-amber-900 dark:text-amber-300">
                    {channelDetails.passcode}
                  </span>
                  <button
                    type="button"
                    onClick={copyPasscode}
                    className="p-1 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    title="Copy passcode"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Channel Actions */}
            <div className="pt-2 space-y-1.5">
              <button
                type="button"
                onClick={handleLeaveChannel}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
                <span>Leave Channel</span>
              </button>

              {channelDetails.isOwner && channelDetails.name.toLowerCase() !== 'vignan' && (
                <button
                  type="button"
                  onClick={handleDeleteChannel}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Channel</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Shared Media & Attachments */}
        <div className="space-y-2">
          <h5 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            Shared Media ({sharedMedia.length})
          </h5>

          {sharedMedia.length === 0 ? (
            <p className="text-[11px] text-slate-400 px-1 italic">No attachments shared yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {sharedMedia.slice(0, 9).map((m) => (
                <a
                  key={m.id}
                  href={m.attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group relative block"
                >
                  {m.attachment.mimetype?.startsWith('image/') ? (
                    <img
                      src={m.attachment.url}
                      alt={m.attachment.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-500">
                      <FileText className="w-6 h-6 text-indigo-500 mb-1" />
                      <span className="text-[9px] truncate w-full text-center">
                        {m.attachment.filename}
                      </span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
