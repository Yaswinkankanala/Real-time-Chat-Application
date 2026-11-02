import React, { useState, useEffect } from 'react';
import {
  Hash,
  Plus,
  Volume2,
  VolumeX,
  LogOut,
  Settings,
  Sparkles,
  Users,
  Bot,
  Search,
  Lock,
  Globe,
  Key,
  UserPlus,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { api } from '../../services/api';
import ChatSphereLogo from '../common/ChatSphereLogo';
import CreateChannelModal from './CreateChannelModal';
import JoinChannelModal from './JoinChannelModal';
import FindPeopleModal from '../chat/FindPeopleModal';
import ProfileModal from '../profile/ProfileModal';

export default function Sidebar({ onOpenAiDrawer }) {
  const { user, logout, showOnboarding, setShowOnboarding } = useAuth();
  const {
    isConnected,
    onlineUserIds,
    activeTarget,
    selectTarget,
    soundEnabled,
    setSoundEnabled
  } = useSocket();

  const [channels, setChannels] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [isJoinChannelOpen, setIsJoinChannelOpen] = useState(false);
  const [isFindPeopleOpen, setIsFindPeopleOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Toggle Theme
  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Load channels and conversations
  const loadSidebarData = async () => {
    try {
      const [chanRes, convRes] = await Promise.all([
        api.getChannels(),
        api.getConversations()
      ]);
      setChannels(chanRes.channels || []);
      setConversations(convRes.conversations || []);

      // Default to #general or #ai-lounge if nothing selected
      if (!activeTarget && chanRes.channels?.length > 0) {
        const defaultChannel = chanRes.channels.find((c) => c.name === 'ai-lounge') || chanRes.channels[0];
        selectTarget('channel', defaultChannel.id, defaultChannel);
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
      c.otherUser.username?.toLowerCase().includes(term)
    );
  });

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* App Branding & Socket Connection Status */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ChatSphereLogo size={34} />
          <div>
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
              <span>ChatSphere</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
              ></span>
              <span className="text-[10px] text-slate-400 font-medium">
                {isConnected ? 'Real-Time Live' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick controls: theme toggle & sound */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
          </button>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-300" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels & chats..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main navigation list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4">
        {/* Featured Nova AI Lounge Item */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              const aiLounge = channels.find((c) => c.name === 'ai-lounge');
              if (aiLounge) {
                selectTarget('channel', aiLounge.id, aiLounge);
              }
            }}
            className={`w-full flex items-center justify-between p-2.5 rounded-2xl transition ${activeTarget?.details?.name === 'ai-lounge'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-900/40'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                <Bot className="w-4 h-4 animate-pulse-subtle" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                  <span>#ai-lounge</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                </p>
                <p className="text-[10px] opacity-80 leading-tight">Nova AI Companion</p>
              </div>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
          </button>
        </div>

        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Channels ({filteredChannels.length})</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsJoinChannelOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Unlock private channel with passcode"
              >
                <Key className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreateChannelOpen(true)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Create new channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-0.5">
            {filteredChannels.map((c) => {
              const isActive = activeTarget?.type === 'channel' && activeTarget.id === c.id;
              if (c.name === 'ai-lounge') return null; // Pinned above

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectTarget('channel', c.id, c)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {c.isPrivate ? (
                      <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                    ) : (
                      <Hash className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    )}
                    <span className="truncate">{c.name}</span>
                  </div>

                  {c.isPrivate && !c.isMember && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                      Passcode
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Conversations Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Direct Chats</span>
            <button
              type="button"
              onClick={() => setIsFindPeopleOpen(true)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Find people to chat"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {filteredConversations.length === 0 ? (
              <div className="p-3 text-center text-slate-500 text-xs">
                <p>No chats yet</p>
                <button
                  onClick={() => setIsFindPeopleOpen(true)}
                  className="mt-1 text-indigo-400 hover:underline font-medium text-[11px]"
                >
                  Find someone to chat
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const u = conv.otherUser;
                const isActive = activeTarget?.type === 'direct' && activeTarget.id === u.id;
                const isOnline = onlineUserIds.includes(u.id) || u.isAgent;

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => selectTarget('direct', u.id, u)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition ${isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={u.avatar}
                        alt={u.displayName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-slate-900"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-semibold">{u.displayName}</span>
                        {u.isAgent && (
                          <span className="px-1 rounded bg-indigo-500/20 text-indigo-300 text-[8px] font-bold">
                            AI
                          </span>
                        )}
                      </div>
                      {conv.lastMessage?.content && (
                        <p className="text-[10px] opacity-70 truncate">{conv.lastMessage.content}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && !isActive && (
                      <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
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

      {/* User Card at Bottom */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2.5 min-w-0 cursor-pointer p-1 rounded-xl hover:bg-slate-800/50 transition flex-1"
          >
            <div className="relative shrink-0">
              <img
                src={user?.avatar}
                alt={user?.displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.displayName}</p>
              <p className="text-[10px] text-slate-400 truncate">@{user?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Profile settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </aside>
  );
}
