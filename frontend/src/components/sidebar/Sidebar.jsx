import React, { useState, useEffect } from 'react';
import {
  Hash,
  Plus,
  Users,
  Search,
  Lock,
  Globe,
  Key,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import CreateChannelModal from './CreateChannelModal';
import JoinChannelModal from './JoinChannelModal';
import FindPeopleModal from '../chat/FindPeopleModal';

export default function Sidebar({ onOpenProfile }) {
  const { user } = useAuth();
  const {
    isConnected,
    onlineUserIds,
    activeTarget,
    selectTarget
  } = useSocket();

  const [channels, setChannels] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);
  const [isFindPeopleOpen, setIsFindPeopleOpen] = useState(false);

  // Load channels and conversations from database
  const loadSidebarData = async () => {
    try {
      const [chanRes, convRes] = await Promise.all([
        api.getChannels(),
        api.getConversations()
      ]);
      const fetchedChannels = chanRes.channels || [];
      setChannels(fetchedChannels);
      setConversations(convRes.conversations || []);

      // If nothing selected and Vignan channel exists, select Vignan
      if (!activeTarget && fetchedChannels.length > 0) {
        const vignan = fetchedChannels.find((c) => c.name.toLowerCase() === 'vignan') || fetchedChannels[0];
        selectTarget('channel', vignan.id, vignan);
      }
    } catch (err) {
      console.error('Failed to load sidebar data:', err);
    }
  };

  useEffect(() => {
    loadSidebarData();
  }, []);

  const handleChannelCreated = (newChan) => {
    setChannels((prev) => [...prev, newChan]);
    selectTarget('channel', newChan.id, newChan);
  };

  const handleChannelJoined = (joinedChan) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === joinedChan.id ? { ...c, isMember: true } : c))
    );
    selectTarget('channel', joinedChan.id, joinedChan);
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = conversations.filter((c) => {
    if (!c.otherUser) return false;
    const term = searchQuery.toLowerCase();
    return (
      c.otherUser.displayName?.toLowerCase().includes(term) ||
      c.otherUser.username?.toLowerCase().includes(term) ||
      c.otherUser.uniqueCode?.toLowerCase().includes(term)
    );
  });

  return (
    <aside className="w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 select-none transition-colors">
      {/* Search Input & Find People Action */}
      <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter channels & chats..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsFindPeopleOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-98"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Find Friends (Code / Phone)</span>
        </button>
      </div>

      {/* Main navigation lists */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Channels ({filteredChannels.length})</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsJoinChannelOpen(true)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Join a channel (passcode)"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                title="Create a new channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            {filteredChannels.length === 0 ? (
              <p className="px-2 py-2 text-[11px] text-slate-400 italic">No channels found</p>
            ) : (
              filteredChannels.map((c) => {
                const isActive = activeTarget?.type === 'channel' && activeTarget.id === c.id;
                const isVignan = c.name.toLowerCase() === 'vignan';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectTarget('channel', c.id, c)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {c.isPrivate ? (
                        <Lock
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-white' : 'text-amber-500 dark:text-amber-400'
                          }`}
                        />
                      ) : (
                        <Globe
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'
                          }`}
                        />
                      )}
                      <span className="truncate">#{c.name}</span>
                      {isVignan && (
                        <span
                          className={`px-1 rounded text-[9px] font-bold ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          Vignan
                        </span>
                      )}
                    </div>

                    {c.isPrivate && !c.isMember && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        Passcode
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Direct Conversations Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Direct Chats ({filteredConversations.length})</span>
            <button
              type="button"
              onClick={() => setIsFindPeopleOpen(true)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Search and add friends"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs rounded-2xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80">
                <MessageSquare className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No chats yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Search friends by their Unique Code or Contact Number.
                </p>
                <button
                  type="button"
                  onClick={() => setIsFindPeopleOpen(true)}
                  className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline text-xs inline-flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Find Friends</span>
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const u = conv.otherUser;
                const isActive = activeTarget?.type === 'direct' && activeTarget.id === u.id;
                const isOnline = onlineUserIds.includes(u.id);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectTarget('direct', u.id, u)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={
                          u.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName || 'User')}`
                        }
                        alt={u.displayName}
                        className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700"
                      />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold">{u.displayName}</span>
                        {u.uniqueCode && (
                          <span
                            className={`font-mono text-[9px] ${
                              isActive ? 'text-white/80' : 'text-slate-400'
                            }`}
                          >
                            {u.uniqueCode}
                          </span>
                        )}
                      </div>
                      {conv.lastMessage?.content && (
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {conv.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && !isActive && (
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onChannelCreated={handleChannelCreated}
      />

      <JoinChannelModal
        isOpen={isJoinChannelOpen}
        onClose={() => setIsJoinChannelOpen(false)}
        channels={channels}
        onChannelJoined={handleChannelJoined}
      />

      <FindPeopleModal
        isOpen={isFindPeopleOpen}
        onClose={() => setIsFindPeopleOpen(false)}
      />
    </aside>
  );
}
