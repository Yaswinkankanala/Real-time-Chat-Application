import React, { useState } from 'react';
import { Hash, Lock, Key, X, ArrowRight, AlertCircle, Check } from 'lucide-react';
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
      setError('Passcode is required for private channels');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Join Channel</h3>
              <p className="text-[11px] text-slate-400">Unlock private channels with a passcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Channel
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {channels.map((c) => {
                const isSelected = selectedChannelId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannelId(c.id);
                      setError('');
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950 border-slate-800/80 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {c.isPrivate ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Hash className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">#{c.name}</p>
                        {c.description && (
                          <p className="text-[10px] text-slate-500 truncate">{c.description}</p>
                        )}
                      </div>
                    </div>

                    {c.isMember ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Member
                      </span>
                    ) : c.isPrivate ? (
                      <span className="text-[10px] font-semibold text-amber-400">Passcode Req</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-indigo-400">Public</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Passcode Field if Selected Channel is Private */}
          {selectedChannel?.isPrivate && !selectedChannel?.isMember && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
              <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Channel Passcode</span>
              </label>
              <input
                type="text"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter passcode (e.g. CS-9842)"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400 uppercase"
              />
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedChannelId || selectedChannel?.isMember}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Join Channel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

