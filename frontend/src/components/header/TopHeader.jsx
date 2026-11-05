import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatSphereLogo from '../common/ChatSphereLogo';

export default function TopHeader({ onOpenProfile, onOpenSettings, onOpenHelp }) {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    if (user?.uniqueCode) {
      navigator.clipboard.writeText(user.uniqueCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between select-none z-30 transition-colors shrink-0">
      {/* Left: ChatSphere Logo & Brand */}
      <div className="flex items-center gap-3">
        <ChatSphereLogo size={36} />
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              ChatSphere
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {isConnected ? 'Real-Time Live' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Prominent User Unique Identification Code with Copy button */}
      {user?.uniqueCode && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-500/30 shadow-sm transition-all hover:border-indigo-400">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
              My Code:
            </span>
            <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white tracking-wider">
              {user.uniqueCode}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="p-1 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition flex items-center gap-1 text-[11px] font-medium"
            title="Copy your unique identification code to share with friends"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Right: User Profile Picture & Dropdown Menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition focus:outline-none"
        >
          <div className="relative">
            <img
              src={
                user?.avatar ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.displayName || 'User')}`
              }
              alt={user?.displayName}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30 dark:ring-indigo-500/40 shadow-sm"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
              {user?.displayName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
              @{user?.username}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu (My Profile, Settings, Help, Log Out) */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fade-in transition-colors">
            {/* Header info in dropdown for mobile */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 md:hidden">
              <p className="text-xs font-bold text-slate-900 dark:text-white">{user?.displayName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">@{user?.username}</p>
              {user?.uniqueCode && (
                <p className="text-[10px] font-mono font-semibold text-indigo-500 mt-0.5">
                  Code: {user.uniqueCode}
                </p>
              )}
            </div>

            <div className="px-1.5 py-1">
              {/* 1. My Profile */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenProfile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>My Profile</span>
              </button>

              {/* 2. Settings */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span>Settings</span>
              </button>

              {/* 3. Help */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenHelp();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span>Help & Guidelines</span>
              </button>
            </div>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            {/* 4. Log Out */}
            <div className="px-1.5">
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

