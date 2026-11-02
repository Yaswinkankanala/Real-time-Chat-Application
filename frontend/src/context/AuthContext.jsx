import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { signInWithGoogle, isFirebaseConfigured, auth, onAuthStateChanged, signOut } from '../firebase/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chatsphere_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Validate existing token on mount
  useEffect(() => {
    async function verifyExistingAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { user: userData } = await api.getMe();
        setUser(userData);
        if (!userData.profileCompleted) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.warn('ChatSphere session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }

    verifyExistingAuth();
  }, [token]);

  const handleAuthSuccess = (res) => {
    localStorage.setItem('chatsphere_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
    setAuthError(null);

    // If new user or profile incomplete, prompt onboarding
    if (res.isNewUser || !res.user.profileCompleted) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  };

  const loginWithEmail = async (login, password) => {
    setAuthError(null);
    try {
      const res = await api.login(login, password);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  const registerWithEmail = async (data) => {
    setAuthError(null);
    try {
      const res = await api.register(data);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Google Login Auth using Firebase
  const loginWithGoogleAuth = async () => {
    setAuthError(null);
    try {
      const { idToken, user: gUser } = await signInWithGoogle();
      // Securely verify token with backend
      const res = await api.verifyFirebaseToken(idToken);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Fast-track demo login
  const loginDemo = async (demoUsername) => {
    return loginWithEmail(demoUsername, 'password123');
  };

  const updateUserProfile = async (updates) => {
    const res = await api.updateProfile(updates);
    setUser(res.user);
    if (res.user.profileCompleted) {
      setShowOnboarding(false);
    }
    return res.user;
  };

  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth).catch(() => {});
      }
      await api.logoutApi().catch(() => {});
    } catch (e) {
      // Ignore cleanup error
    } finally {
      localStorage.removeItem('chatsphere_auth_token');
      setToken(null);
      setUser(null);
      setShowOnboarding(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        showOnboarding,
        setShowOnboarding,
        isFirebaseConfigured: isFirebaseConfigured(),
        loginWithEmail,
        registerWithEmail,
        loginWithGoogleAuth,
        loginDemo,
        logout,
        updateUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
