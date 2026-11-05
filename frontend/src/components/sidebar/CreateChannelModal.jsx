import React, { useState } from 'react';
import { Hash, X, Plus, Lock, Globe, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export default function CreateChannelModal({ isOpen, onClose, onChannelCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Passcode success display modal state
  const [createdPasscode, setCreatedPasscode] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Channel name is required.');
      return;
    }

    if (isPrivate && !passcode.trim()) {
      setError('A passcode is mandatory for creating a private channel.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.createChannel({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim(),
        isPrivate,
        passcode: isPrivate ? passcode.trim() : undefined,
        icon: isPrivate ? '🔒' : '💬'
      });

      const newChan = res.channel;

      if (isPrivate && newChan.passcode) {
        setCreatedPasscode(newChan.passcode);
        onChannelCreated(newChan);
      } else {
        setName('');
        setDescription('');
        setIsPrivate(false);
        setPasscode('');
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
    setPasscode('');
    onClose();
  };

  // If passcode created, show confirmation card
  if (createdPasscode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-500/30">
            <Key className="w-7 h-7" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Private Channel Created!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
            Share this passcode with teammates so they can join this channel. Keep it confidential.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between mb-6">
            <span className="font-mono text-xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
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
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition"
          >
            Enter Channel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl transition-colors max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Channel</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Public or passcode-protected channel</p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Select Channel Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {/* Public option */}
              <button
                type="button"
                onClick={() => {
                  setIsPrivate(false);
                  setPasscode('');
                  setError('');
                }}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  !isPrivate
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <Globe className={`w-4 h-4 mt-0.5 shrink-0 ${!isPrivate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Public</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Open to all members</p>
                </div>
              </button>

              {/* Private option */}
              <button
                type="button"
                onClick={() => {
                  setIsPrivate(true);
                  setError('');
                }}
                className={`p-3 rounded-2xl border text-left transition flex items-start gap-2.5 ${
                  isPrivate
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${isPrivate ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">Private</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Passcode required</p>
                </div>
              </button>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Channel Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="text-slate-400 absolute left-3.5 top-2.5 font-bold">#</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. project-discussions"
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Mandatory Passcode (Only for Private Channel) */}
          {isPrivate && (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 animate-fade-in">
              <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                Channel Passcode (Mandatory) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-amber-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required={isPrivate}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="e.g. 1299 or TeamPass2026"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700/60 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono font-bold"
                />
              </div>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5">
                Users will be required to enter this passcode before they can view or send messages.
              </p>
            </div>
          )}

          {/* Channel Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

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
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Create Channel</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
