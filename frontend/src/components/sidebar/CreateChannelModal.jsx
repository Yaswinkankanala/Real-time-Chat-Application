import React, { useState } from 'react';
import { Hash, X, Plus, Lock, Globe, Key, Copy, Check } from 'lucide-react';
import { api } from '../../services/api';

export default function CreateChannelModal({ isOpen, onClose, onChannelCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [customPasscode, setCustomPasscode] = useState('');
  const [icon, setIcon] = useState('💬');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passcode success display modal state
  const [createdPasscode, setCreatedPasscode] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await api.createChannel({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
        isPrivate,
        icon: isPrivate ? '🔒' : icon,
        passcode: isPrivate ? (customPasscode.trim() || undefined) : undefined
      });

      const newChan = res.channel;

      if (isPrivate && newChan.passcode) {
        setCreatedPasscode(newChan.passcode);
        onChannelCreated(newChan);
      } else {
        setName('');
        setDescription('');
        setIsPrivate(false);
        setCustomPasscode('');
        onChannelCreated(newChan);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const copyPasscode = () => {
    if (createdPasscode) {
      navigator.clipboard.writeText(createdPasscode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    setCreatedPasscode(null);
    setName('');
    setDescription('');
    setIsPrivate(false);
    setCustomPasscode('');
    onClose();
  };

  // If passcode created, show passcode revelation screen
  if (createdPasscode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <Key className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Private Channel Created!</h3>
          <p className="text-xs text-slate-400 mb-5">
            Share this passcode with teammates so they can unlock and join this channel.
          </p>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-6">
            <span className="font-mono text-xl font-extrabold text-indigo-400 tracking-wider">
              {createdPasscode}
            </span>
            <button
              type="button"
              onClick={copyPasscode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
          >
            Go to Channel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create New Channel</h3>
              <p className="text-[11px] text-slate-400">Team channels with custom privacy & passcodes</p>
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
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">#</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="design-squad, engineering, announcements"
                className="w-full pl-7 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Visibility Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Channel Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${!isPrivate
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Globe className="w-4 h-4 shrink-0 text-indigo-400" />
                <div>
                  <p className="text-xs font-bold">Public</p>
                  <p className="text-[10px] opacity-70">Anyone can join</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${isPrivate
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
              >
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-xs font-bold">Private</p>
                  <p className="text-[10px] opacity-70">Passcode protected</p>
                </div>
              </button>
            </div>
          </div>

          {/* Passcode Input if Private */}
          {isPrivate && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
              <label className="block text-xs font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                <span>Custom Passcode (Optional)</span>
              </label>
              <input
                type="text"
                value={customPasscode}
                onChange={(e) => setCustomPasscode(e.target.value)}
                placeholder="Leave blank to auto-generate (e.g. CS-9842)"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/40 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
              />
              <p className="text-[10px] text-amber-400/80 mt-1">
                A secure passcode will be generated automatically if left empty.
              </p>
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
              disabled={loading || !name.trim()}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
