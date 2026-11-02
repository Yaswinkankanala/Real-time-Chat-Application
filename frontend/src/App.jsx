import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import LoginModal from './components/auth/LoginModal';
import OnboardingModal from './components/profile/OnboardingModal';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import RightDetailsSidebar from './components/chat/RightDetailsSidebar';
import AiAssistantDrawer from './components/ai/AiAssistantDrawer';
import ChatSphereLogo from './components/common/ChatSphereLogo';

function AuthenticatedApp() {
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  return (
    <SocketProvider>
      <div className="flex h-screen w-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
        {/* Left Navigation Sidebar */}
        <Sidebar onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />

        {/* Central Chat View */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative">
          <ChatArea
            onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
            onToggleRightSidebar={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
            isRightSidebarOpen={isRightSidebarOpen}
          />
        </main>

        {/* Right Details Sidebar (Profile & Channel info, shared media, passcode) */}
        <RightDetailsSidebar
          isOpen={isRightSidebarOpen}
          onClose={() => setIsRightSidebarOpen(false)}
        />

        {/* Nova AI Slide-out Assistant Drawer */}
        <AiAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
        />
      </div>
    </SocketProvider>
  );
}

export default function App() {
  const { user, loading, showOnboarding } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white select-none">
        <div className="flex flex-col items-center gap-4">
          <ChatSphereLogo size={64} className="animate-pulse" />
          <div className="text-center">
            <h1 className="text-lg font-bold text-white tracking-tight">ChatSphere</h1>
            <p className="text-xs text-slate-400 mt-0.5">Connecting to real-time network...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginModal />;
  }

  return (
    <>
      <AuthenticatedApp />
      {/* Onboarding profile completion modal for new Google OAuth sign-ins */}
      <OnboardingModal isOpen={showOnboarding || !user?.profileCompleted} />
    </>
  );
}
