import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquare, Phone, Key, UserCheck, Check, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { resolveAvatarUrl, handleAvatarError } from '../../utils/avatar';

export default function FindPeopleModal({ isOpen, onClose }) {
  const { user: currentUser } = useAuth();
  const { selectTarget, onlineUserIds } = useSocket();
  const [query, setQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setUsersList([]);
      setError('');
    }
  }, [isOpen]);

  const handleSearch = async (searchTerm) => {
    const clean = searchTerm.trim();
    if (!clean) {
      setUsersList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.searchUsers(clean);
      setUsersList(res.users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
      setError('Error searching users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  const handleStartChat = async (targetUser) => {
    if (!targetUser || targetUser.id === currentUser?.id) return;
    try {
      await api.createConversation(targetUser.id);
      selectTarget('direct', targetUser.id, targetUser);
      // Immediately notify application & sidebar to update conversation list
      try {
        window.dispatchEvent(
          new CustomEvent('chatsphere:conversation-updated', {
            detail: { targetUserId: targetUser.id }
          })
        );
      } catch (e) {}
      onClose();
    } catch (err) {
      console.error('Failed to start conversation:', err);
      setError('Failed to start conversation: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Find Friends</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Search by Unique Code or Contact Number
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

        {/* Search Bar */}
        <div className="py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleSearchChange}
              placeholder="Enter Unique Code (e.g. CS8K92A) or Phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 px-1">
            Tip: Search using your friend's exact <span className="font-semibold text-indigo-600 dark:text-indigo-400">CS-Code</span> or <span className="font-semibold text-indigo-600 dark:text-indigo-400">Contact Number</span>.
          </p>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching registered users...</span>
            </div>
          ) : query.trim() === '' ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              <Key className="w-8 h-8 text-indigo-500/40 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Search for Friends</p>
              <p className="mt-1 max-w-xs mx-auto text-slate-400">
                Ask your friend for their ChatSphere Unique Code or registered phone number.
              </p>
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">No registered user found</p>
              <p className="mt-1 max-w-xs mx-auto text-slate-400">
                Make sure the unique code or phone number is typed correctly.
              </p>
            </div>
          ) : (
            usersList.map((u) => {
              const isOnline = onlineUserIds.includes(u.id);

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={resolveAvatarUrl(u.avatar, u.displayName)}
                        alt={u.displayName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                        onError={(e) => handleAvatarError(e, u.displayName)}
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {u.displayName}
                        </p>
                        <span className="text-[10px] text-slate-400 truncate">@{u.username}</span>
                      </div>

                      {/* Prominent display of Unique Identification Code */}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-bold border border-indigo-200 dark:border-indigo-500/30">
                          {u.uniqueCode}
                        </span>
                        {u.mobileNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {u.mobileNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {u.id === currentUser?.id ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-xs shrink-0 ml-2">
                      You
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartChat(u)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 shrink-0 ml-2"
                      title={`Message ${u.displayName}`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
