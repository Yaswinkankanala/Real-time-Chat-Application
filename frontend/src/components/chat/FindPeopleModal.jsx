import React, { useState, useEffect } from 'react';
import { Search, X, UserPlus, MessageSquare, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

export default function FindPeopleModal({ isOpen, onClose }) {
  const { selectTarget, onlineUserIds } = useSocket();
  const [query, setQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers('');
    }
  }, [isOpen]);

  const loadUsers = async (searchTerm) => {
    setLoading(true);
    try {
      const res = await api.searchUsers(searchTerm);
      setUsersList(res.users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    loadUsers(val);
  };

  const handleStartChat = async (targetUser) => {
    try {
      await api.createConversation(targetUser.id);
      selectTarget('direct', targetUser.id, targetUser);
      onClose();
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Find People</h3>
              <p className="text-[11px] text-slate-400">Discover registered users and start a chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="py-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={handleSearchChange}
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
              <span>Searching users...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <p className="font-medium text-slate-400">No users found</p>
              <p className="mt-1">Try a different name or invite your friends to join ChatSphere!</p>
            </div>
          ) : (
            usersList.map((u) => {
              const isOnline = onlineUserIds.includes(u.id) || u.isAgent;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/40 hover:bg-slate-800/60 border border-slate-800/60 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar}
                        alt={u.displayName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-800"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950"></span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span>{u.displayName}</span>
                        {u.isAgent && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                            AI
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">@{u.username}</p>
                      {u.bio && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{u.bio}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartChat(u)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

