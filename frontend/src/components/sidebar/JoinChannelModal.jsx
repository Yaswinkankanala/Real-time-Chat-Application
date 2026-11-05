import React, { useState } from 'react';
import { Hash, Lock, Key, X, ArrowRight, AlertCircle, Check, Globe } from 'lucide-react';
import { api } from '../../services/api';

export default function JoinChannelModal({ isOpen, onClose, channels = [], onChannelJoined }) {
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!selectedChannelId) {
      setError('Please select a channel to join');
      return;
    }

    if (selectedChannel?.isPrivate && !passcode.trim()) {
      setError('A passcode is mandatory to join this private channel.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.joinChannel(selectedChannelId, passcode.trim());
      onChannelJoined(res.channel);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to join channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Join Channel</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Discover and enter public or private channels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select a Channel
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {channels.map((c) => {
                const isSelected = selectedChannelId === c.id;
                const isVignan = c.name.toLowerCase() === 'vignan';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannelId(c.id);
                      setError('');
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.isPrivate ? (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Globe className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            #{c.name}
                          </p>
                          {isVignan && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-[9px]">
                              Official
                            </span>
                          )}
                        </div>
                        {c.description && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {c.isMember ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                          Joined
                        </span>
                      ) : c.isPrivate ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          Passcode
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          Public
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passcode Input (Required for Private channels) */}
          {selectedChannel?.isPrivate && !selectedChannel?.isMember && (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 animate-fade-in">
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                Enter Channel Passcode <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 1299"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>
              {selectedChannel.name.toLowerCase() === 'vignan' && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5 font-medium">
                  Enter passcode <strong className="font-bold underline">1299</strong> to join the Vignan channel.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedChannelId || selectedChannel?.isMember}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : selectedChannel?.isMember ? (
                <span>Already Joined</span>
              ) : (
                <span>Join Channel</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
