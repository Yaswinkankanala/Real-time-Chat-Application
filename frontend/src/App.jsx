import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginModal from './components/auth/LoginModal';
import OnboardingModal from './components/profile/OnboardingModal';
import ProfileModal from './components/profile/ProfileModal';
import SettingsModal from './components/settings/SettingsModal';
import HelpModal from './components/help/HelpModal';
import TopHeader from './components/header/TopHeader';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import RightDetailsSidebar from './components/chat/RightDetailsSidebar';
import ChatSphereLogo from './components/common/ChatSphereLogo';

function AuthenticatedApp() {
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <SocketProvider>
      <div className="flex flex-col h-screen w-screen bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors">
        {/* Top Navigation Header with Unique Code & Profile Dropdown */}
        <TopHeader
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
        />

        {/* Main Work Area */}
        <div className="flex-1 flex min-w-0 h-[calc(100vh-4rem)] overflow-hidden">
          {/* Left Navigation Sidebar */}
          <Sidebar onOpenProfile={() => setIsProfileOpen(true)} />

          {/* Central Real-time Chat View */}
          <main className="flex-1 flex flex-col min-w-0 h-full relative">
            <ChatArea
              onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              isRightSidebarOpen={isRightSidebarOpen}
            />
          </main>

          {/* Right Details Sidebar */}
          <RightDetailsSidebar
            isOpen={isRightSidebarOpen}
            onClose={() => setIsRightSidebarOpen(false)}
          />
        </div>

        {/* Global Modals */}
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </div>
    </SocketProvider>
  );
}

export default function App() {
  const { user, loading, showOnboarding } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white select-none transition-colors">
        <div className="flex flex-col items-center gap-4">
          <ChatSphereLogo size={64} className="animate-pulse" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">ChatSphere</h1>
            <p className="text-xs text-slate-400 mt-0.5">Connecting to real-time network...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  // Pending Registration State: Incomplete users must strictly complete all 8 mandatory fields before accessing dashboard, chats, or channels
  if (!user?.profileCompleted || showOnboarding) {
    return <OnboardingModal isOpen={true} />;
  }

  return <AuthenticatedApp />;
}
