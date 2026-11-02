import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firebaseConfig, isFirebaseConfigured } from '../../firebase/config';
import ChatSphereLogo from '../common/ChatSphereLogo';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  LogIn,
  UserPlus,
  AlertCircle,
  Settings,
  HelpCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

export default function LoginModal() {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogleAuth,
    resetPassword,
    loginDemo,
    authError,
    isFirebaseConfigured: fbActive
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState(firebaseConfig.apiKey || '');
  const [customProjectId, setCustomProjectId] = useState(firebaseConfig.projectId || '');
  const [customAppId, setCustomAppId] = useState(firebaseConfig.appId || '');
  const [configSuccess, setConfigSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setResetSuccessMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        if (!formData.email) {
          throw new Error('Please enter your email address to receive password reset instructions.');
        }
        await resetPassword(formData.email);
        setResetSuccessMessage(`Password reset link sent to ${formData.email}! Check your inbox.`);
      } else if (mode === 'login') {
        await loginWithEmail(formData.email || formData.username, formData.password);
      } else {
        await registerWithEmail({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName || formData.username
        });
      }
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError('');
    setResetSuccessMessage('');
    setLoading(true);
    try {
      await loginWithGoogleAuth();
    } catch (err) {
      setLocalError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async (name) => {
    setLocalError('');
    setResetSuccessMessage('');
    setLoading(true);
    try {
      await loginDemo(name);
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCustomFirebase = () => {
    if (customApiKey && customProjectId) {
      const newConfig = {
        ...firebaseConfig,
        apiKey: customApiKey.trim(),
        authDomain: `${customProjectId.trim()}.firebaseapp.com`,
        projectId: customProjectId.trim(),
        storageBucket: `${customProjectId.trim()}.appspot.com`,
        appId: customAppId.trim() || `1:102938475610:web:${Math.random().toString(36).substring(2, 10)}`
      };
      localStorage.setItem('chatsphere_firebase_custom_config', JSON.stringify(newConfig));
      setConfigSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  };

  const resetToDefaultFirebase = () => {
    localStorage.removeItem('chatsphere_firebase_custom_config');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl overflow-y-auto">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>

      <div className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl my-6">
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <ChatSphereLogo size={56} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            ChatSphere
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Real-time messaging, protected channels & Nova AI
          </p>
        </div>

        {/* Error notification */}
        {(localError || authError) && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-xs animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{localError || authError}</span>
          </div>
        )}

        {/* Success notification (e.g. password reset) */}
        {resetSuccessMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{resetSuccessMessage}</span>
          </div>
        )}

        {/* Primary Google Login Button (Firebase OAuth) */}
        <div className="mb-5">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-slate-900 font-semibold shadow-md hover:bg-slate-100 active:scale-[0.99] transition-all disabled:opacity-60 text-xs sm:text-sm"
          >
            {/* Google 'G' Icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Firebase Connection Status & Settings Toggle */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${fbActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {fbActive ? (
                <span className="text-emerald-400 font-medium">Firebase Auth Active</span>
              ) : (
                <span className="text-amber-300 font-medium">Demo / Sandbox Auth</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 flex items-center gap-1 font-medium"
            >
              <Settings className="w-3 h-3" />
              <span>Firebase Keys</span>
            </button>
          </div>
        </div>

        {/* Custom Firebase Setup Modal Drawer */}
        {showConfigModal && (
          <div className="mb-5 p-4 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs animate-fade-in shadow-xl">
            <div className="flex justify-between items-center mb-2 font-semibold text-slate-100">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Firebase Authentication Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-400 mb-3 text-[11px] leading-relaxed">
              Connect your Firebase Console project. Enable <strong>Google</strong> and <strong>Email/Password</strong> under <em>Build &gt; Authentication</em>.
            </p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-slate-300 block mb-1 text-[11px]">Firebase Web API Key</label>
                <input
                  type="text"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 text-[11px]">Firebase Project ID</label>
                <input
                  type="text"
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  placeholder="chatsphere-production"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-slate-300 block mb-1 text-[11px]">Web App ID (Optional)</label>
                <input
                  type="text"
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveCustomFirebase}
                className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition text-xs shadow-md"
              >
                {configSuccess ? 'Saved! Reloading...' : 'Save & Reload'}
              </button>
              <button
                type="button"
                onClick={resetToDefaultFirebase}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-xs"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 absolute">
            Or continue with email
          </span>
        </div>

        {/* Tab switch */}
        {mode !== 'forgot' ? (
          <div className="flex p-1 bg-slate-950/60 rounded-xl mb-4 border border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('login'); setLocalError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setLocalError(''); }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setLocalError(''); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
            <span className="text-xs font-bold text-slate-300">Reset Password</span>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Alex Morgan"
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <span className="text-slate-500 absolute left-3.5 top-2 text-xs font-mono">@</span>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="alexm"
                    className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address {mode === 'login' && !fbActive ? '/ Username' : ''}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={mode === 'forgot' ? 'email' : 'text'}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@domain.com"
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {mode === 'login' && fbActive && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setLocalError(''); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] font-bold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-60 text-xs mt-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : mode === 'forgot' ? (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Send Password Reset Link</span>
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast-Track Demo Accounts */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
            ⚡ Quick Test Profiles (1-Click)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'alice', label: 'Alice', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60' },
              { name: 'bob', label: 'Bob', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60' },
              { name: 'charlie', label: 'Charlie', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60' }
            ].map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleDemoSignIn(p.name)}
                className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-left transition group"
              >
                <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate">
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
