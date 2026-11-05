import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  UserPlus,
  UserCheck,
  Search,
  MessageSquare,
  Send,
  Globe,
  Lock,
  PlusCircle,
  Sliders,
  LogOut,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const GUIDELINES = [
  {
    id: 'create-account',
    icon: UserPlus,
    title: '1. How to create an account',
    content:
      'Click on the "Sign Up" tab on the authentication screen. Enter your Full Name, unique Username, Email Address, a secure Password (at least 6 characters), and your Contact Number. Upon registration, ChatSphere automatically generates your permanent unique identification code (e.g. CS8K92A) and signs you in.'
  },
  {
    id: 'complete-profile',
    icon: UserCheck,
    title: '2. How to complete your profile',
    content:
      'All 8 profile fields are mandatory: Full Name, Username, Gender, Date of Birth, Contact Number, Email Address, Profile Photo, and Interests. You can pick an image directly from your device media gallery and preview it before saving. You can edit personal information anytime via "My Profile" from the top-right menu.'
  },
  {
    id: 'find-friends',
    icon: Search,
    title: '3. How to find friends using their unique code or phone number',
    content:
      'Click "Find People" in the left sidebar or the search icon. Enter your friend\'s permanent ChatSphere Unique Code (e.g., CS8K92A) or their registered Contact Number. The matched registered user card appears with their photo, name, username, and code.'
  },
  {
    id: 'start-conversation',
    icon: MessageSquare,
    title: '4. How to start a conversation',
    content:
      'After finding your friend in the search modal, click "Chat" or "Start Conversation". A direct one-to-one conversation will be created and saved in your direct chats list.'
  },
  {
    id: 'send-receive',
    icon: Send,
    title: '5. How to send and receive messages',
    content:
      'Click on any direct chat or joined channel from the left sidebar. Type your message in the bottom input bar and press Enter or the Send button. You can also attach photos or documents using the paperclip icon. If your friend is offline, you will see a notification stating that your message will be delivered as soon as they come online.'
  },
  {
    id: 'join-public',
    icon: Globe,
    title: '6. How to join a public channel',
    content:
      'Public channels are open to all registered ChatSphere users. Simply click on any public channel listed in your sidebar or click the "Join Channel" button to participate without needing any passcode.'
  },
  {
    id: 'join-private',
    icon: Lock,
    title: '7. How to join a private channel using a passcode',
    content:
      'Click the key icon (Join Channel) in the Channels header. Select the private channel, enter the mandatory passcode, and click "Join Channel". For example, to join the official default "Vignan" channel, enter passcode 1299.'
  },
  {
    id: 'create-channel',
    icon: PlusCircle,
    title: '8. How to create a public or private channel',
    content:
      'Click the "+" button next to Channels in the left sidebar. Choose whether you want a Public channel or a Private channel. For private channels, entering a passcode is mandatory. As creator, you become the channel owner.'
  },
  {
    id: 'settings-theme',
    icon: Sliders,
    title: '9. How to change notification and theme settings',
    content:
      'Click your profile photo at the top-right corner and select "Settings". You can toggle Notifications ON or OFF and switch between Dark Mode and Light Mode. Your preferences are saved to your account and applied across the entire application.'
  },
  {
    id: 'logout',
    icon: LogOut,
    title: '10. How to log out',
    content:
      'Click your profile photo in the top-right corner and select "Log Out". Your active real-time socket connection is safely disconnected, stored authentication tokens are removed, and you are returned to the sign-in screen.'
  },
  {
    id: 'delete-account',
    icon: Trash2,
    title: '11. How to delete an account (10-Day Policy)',
    content:
      'ChatSphere enforces a 10-day security hold on account deletion to protect user identity. Inside Settings > Delete Account, you can see the remaining time before deletion unlocks. Once 10 days have elapsed, the deletion button becomes active. Confirming will permanently erase your profile and records.'
  }
];

export default function HelpModal({ isOpen, onClose }) {
  const [expandedId, setExpandedId] = useState('create-account');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh] transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">ChatSphere Help & Guide</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Step-by-step instructions for all features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guidelines List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {GUIDELINES.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
                      {item.title}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/40 dark:border-slate-700/40">
                    {item.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

