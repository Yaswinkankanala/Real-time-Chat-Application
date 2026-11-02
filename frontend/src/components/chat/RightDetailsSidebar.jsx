import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Tag, 
  Shield, 
  Lock, 
  Globe, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  Users, 
  LogOut, 
  Trash2, 
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';

export default function RightDetailsSidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeTarget, messages, onlineUserIds, selectTarget } = useSocket();

  const [channelDetails, setChannelDetails] = useState(null);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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

  const handleRegeneratePasscode = async () => {
    if (!channelDetails?.id) return;
    setRegenerating(true);
    try {
      const res = await api.regeneratePasscode(channelDetails.id);
      setChannelDetails((prev) => ({ ...prev, passcode: res.passcode }));
    } catch (err) {
      alert('Failed to regenerate passcode: ' + err.message);
    } finally {
      setRegenerating(false);
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
    <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 animate-fade-in select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          {isChannel ? 'Channel Details' : 'Conversation Profile'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* ===================================== */}
        {/* 1-TO-1 USER PROFILE VIEW */}
        {/* ===================================== */}
        {isDirect && (
          <>
            <div className="flex flex-col items-center text-center p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="relative mb-3">
                <img
                  src={targetUser?.avatar}
                  alt={targetUser?.displayName}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/20"
                />
                {onlineUserIds.includes(targetUser?.id) && (
                  <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
                )}
              </div>
              <h4 className="text-sm font-bold text-white">{targetUser?.displayName}</h4>
              <p className="text-xs text-slate-400">@{targetUser?.username}</p>
              {targetUser?.status && (
                <p className="text-xs text-indigo-400 mt-1 font-medium">{targetUser.status}</p>
              )}
            </div>

            {/* Bio & Location */}
            {(targetUser?.bio || targetUser?.location) && (
              <div className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60 text-xs space-y-2">
                {targetUser.bio && (
                  <p className="text-slate-300 leading-relaxed">{targetUser.bio}</p>
                )}
                {targetUser.location && (
                  <p className="text-slate-400 flex items-center gap-1.5 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{targetUser.location}</span>
                  </p>
                )}
              </div>
            )}

            {/* Interests */}
            {targetUser?.interests && targetUser.interests.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-400" /> Interests
                </p>
                <div className="flex flex-wrap gap-1">
                  {targetUser.interests.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================== */}
        {/* CHANNEL DETAILS VIEW */}
        {/* ===================================== */}
        {isChannel && channelDetails && (
          <>
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-2xl">{channelDetails.icon || (channelDetails.isPrivate ? '🔒' : '💬')}</span>
                <div>
                  <h4 className="text-sm font-bold text-white">#{channelDetails.name}</h4>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${channelDetails.isPrivate ? 'text-amber-400' : 'text-indigo-400'}`}>
                    {channelDetails.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    <span>{channelDetails.isPrivate ? 'Private Channel' : 'Public Channel'}</span>
                  </span>
                </div>
              </div>

              {channelDetails.description && (
                <p className="text-xs text-slate-300 leading-relaxed mt-2 pt-2 border-t border-slate-800">
                  {channelDetails.description}
                </p>
              )}
            </div>

            {/* Passcode Card if Owner or Passcode available */}
            {channelDetails.isPrivate && channelDetails.passcode && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Channel Passcode
                  </span>
                  {channelDetails.isOwner && (
                    <button
                      type="button"
                      onClick={handleRegeneratePasscode}
                      disabled={regenerating}
                      className="text-[10px] text-amber-400 hover:text-amber-200 underline flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-amber-500/40">
                  <span className="font-mono text-sm font-extrabold text-amber-300 tracking-wider">
                    {channelDetails.passcode}
                  </span>
                  <button
                    type="button"
                    onClick={copyPasscode}
                    className="p-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition"
                    title="Copy Passcode"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Channel Members List */}
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Members</span>
                </span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-400">
                  {channelDetails.membersList?.length || 0}
                </span>
              </p>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {(channelDetails.membersList || []).map((m) => {
                  const isOnline = onlineUserIds.includes(m.id) || m.isAgent;
                  const isChanOwner = m.id === channelDetails.ownerId;

                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/40 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={m.avatar}
                            alt={m.displayName}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          )}
                        </div>
                        <span className="text-xs text-slate-200 truncate">{m.displayName}</span>
                      </div>

                      {isChanOwner && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                          Owner
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions: Leave / Delete */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              {!channelDetails.isOwner && (
                <button
                  type="button"
                  onClick={handleLeaveChannel}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Leave Channel</span>
                </button>
              )}

              {channelDetails.isOwner && (
                <button
                  type="button"
                  onClick={handleDeleteChannel}
                  className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Channel</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* ===================================== */}
        {/* SHARED MEDIA & ATTACHMENTS */}
        {/* ===================================== */}
        <div className="pt-2 border-t border-slate-800">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Shared Media ({sharedMedia.length})</span>
          </p>

          {sharedMedia.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">No media or files shared yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {sharedMedia.slice(-6).map((m) => (
                <a
                  key={m.id}
                  href={`http://localhost:5000${m.attachment.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative rounded-xl overflow-hidden border border-slate-800 aspect-square bg-slate-950 flex items-center justify-center"
                >
                  {m.attachment.mimetype?.startsWith('image/') ? (
                    <img
                      src={`http://localhost:5000${m.attachment.url}`}
                      alt={m.attachment.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="flex flex-col items-center p-2 text-center">
                      <FileText className="w-5 h-5 text-indigo-400 mb-1" />
                      <span className="text-[9px] text-slate-300 truncate max-w-full">
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

