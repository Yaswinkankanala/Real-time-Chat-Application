import React, { useState } from 'react';
import {
  X,
  Settings,
  Bell,
  BellOff,
  Sun,
  Moon,
  Trash2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { user, updateUserProfile, theme, toggleTheme, deleteAccount } = useAuth();

  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!isOpen || !user) return null;

  // Calculate 10-day account age restriction
  const createdTime = new Date(user.createdAt || Date.now()).getTime();
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - createdTime;
  const canDeleteAccount = elapsedMs >= TEN_DAYS_MS;

  const remainingMs = Math.max(0, TEN_DAYS_MS - elapsedMs);
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const handleToggleNotifications = async () => {
    setSavingNotifications(true);
    try {
      const nextVal = !user.notificationsEnabled;
      await updateUserProfile({ notificationsEnabled: nextVal });
    } catch (err) {
      console.error('Failed to update notifications:', err);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleDeleteAccountConfirmed = async () => {
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Settings</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Preferences & account management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* 1. Notifications Preference */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {user.notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-slate-400" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Notifications</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user.notificationsEnabled ? 'Message alerts enabled' : 'Muted'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={savingNotifications}
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                user.notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  user.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 2. Theme Preference (Dark Mode / Light Mode) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Appearance</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {theme === 'dark' ? 'Dark Theme' : 'Light Theme'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => toggleTheme('light')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  theme === 'light'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => toggleTheme('dark')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* 3. Account Security & Deletion (10-Day Policy) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Danger Zone
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                10-Day Policy
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30">
              <div className="flex items-start gap-2.5 mb-3">
                <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete Account</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Account deletion is protected and only available 10 days after account creation.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div className="mb-3 p-2 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
                  {deleteError}
                </div>
              )}

              {canDeleteAccount ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-98"
                >
                  Request Account Deletion
                </button>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-medium">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Deletion unlocks in <strong className="text-slate-900 dark:text-slate-200">{remainingDays}d {remainingHours}h</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                Permanently Delete Account?
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                This will delete your profile, identification code (<strong className="text-indigo-500">{user.uniqueCode}</strong>), and remove you from all channels. This action cannot be undone.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDeleteAccountConfirmed}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5"
                >
                  {deleteLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Yes, Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

