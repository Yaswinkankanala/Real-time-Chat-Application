import React, { useState } from 'react';
import {
  Compass,
  Hash,
  Lock,
  Globe,
  Key,
  X,
  ArrowRight,
  AlertCircle,
  Check,
  Search,
  Users
} from 'lucide-react';
import { api } from '../../services/api';

export default function ExploreChannelsModal({ isOpen, onClose, channels = [], onChannelJoined }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'public' | 'private'
  const [search, setSearch] = useState('');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectChannel = (chan) => {
    setError('');
    setPasscode('');
    if (chan.isMember) {
      // Already a member, notify parent to select it and close
      onChannelJoined(chan);
      onClose();
      return;
    }
    setSelectedChannel(chan);
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChannel) return;

    if (selectedChannel.isPrivate && !passcode.trim()) {
      setError('Please enter the passcode for this private channel.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.joinChannel(selectedChannel.id, passcode.trim());
      onChannelJoined(res.channel);
      onClose();
    } catch (err) {
      setError(err.message || 'Incorrect passcode. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredList = channels.filter((c) => {
    if (filter === 'public' && c.isPrivate) return false;
    if (filter === 'private' && !c.isPrivate) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-colors max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Explore Channels
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Discover and join public communities or enter protected spaces
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="pt-4 pb-2 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels by name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { setFilter('all'); setSelectedChannel(null); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Channels ({channels.length})
            </button>
            <button
              type="button"
              onClick={() => { setFilter('public'); setSelectedChannel(null); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filter === 'public'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => { setFilter('private'); setSelectedChannel(null); }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filter === 'private'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Protected (Passcode)
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="my-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-fade-in shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No channels match your query.
            </div>
          ) : (
            filteredList.map((c) => {
              const isSelected = selectedChannel?.id === c.id;
              const isVignan = c.name.toLowerCase() === 'vignan';

              return (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-sm'
                      : 'bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.isPrivate ? (
                        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            #{c.name}
                          </p>
                          {isVignan && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 font-bold text-[9px]">
                              Official Private Channel
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {c.memberCount || 0}
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {c.isMember ? (
                        <button
                          type="button"
                          onClick={() => handleSelectChannel(c)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
                        >
                          <Check className="w-3 h-3" />
                          <span>Joined</span>
                        </button>
                      ) : c.isPrivate ? (
                        <button
                          type="button"
                          onClick={() => handleSelectChannel(c)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Enter Passcode</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectChannel(c)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1"
                        >
                          <span>Join Channel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Passcode Drawer if private channel selected */}
                  {isSelected && !c.isMember && c.isPrivate && (
                    <form onSubmit={handleJoinSubmit} className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 animate-fade-in space-y-2">
                      <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        Enter Passcode to Join #{c.name}
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Key className="w-3.5 h-3.5 text-amber-500 absolute left-3 top-2.5" />
                          <input
                            type="password"
                            required
                            autoFocus
                            value={passcode}
                            onChange={(e) => setPasscode(e.target.value)}
                            placeholder="Enter channel passcode..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={loading || !passcode.trim()}
                          className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          {loading ? 'Verifying...' : 'Unlock & Join'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Public Channel Confirmation if selected */}
                  {isSelected && !c.isMember && !c.isPrivate && (
                    <form onSubmit={handleJoinSubmit} className="mt-3 pt-3 border-t border-indigo-200/60 dark:border-indigo-900/40 animate-fade-in flex items-center justify-between">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        This is a public community channel. Anyone can participate.
                      </p>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition active:scale-95 disabled:opacity-50"
                      >
                        {loading ? 'Joining...' : 'Confirm & Join'}
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

