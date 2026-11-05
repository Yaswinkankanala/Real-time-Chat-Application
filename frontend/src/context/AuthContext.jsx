import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  auth,
  signInWithGoogle,
  signInWithFirebaseEmail,
  signUpWithFirebaseEmail,
  sendFirebasePasswordReset,
  isFirebaseConfigured
} from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('chatsphere_auth_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Global Theme state ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chatsphere_theme') || 'dark';
  });

  // Apply theme to HTML root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('chatsphere_theme', theme);
  }, [theme]);

  // Set user theme when user profile is loaded
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
    }
  }, [user?.theme]);

  const toggleTheme = async (mode) => {
    const nextTheme = mode || (theme === 'dark' ? 'light' : 'dark');
    setTheme(nextTheme);
    if (user) {
      try {
        await api.updateProfile({ theme: nextTheme });
        setUser((prev) => (prev ? { ...prev, theme: nextTheme } : prev));
      } catch (e) {
        // Silent update failure fallback
      }
    }
  };

  // Validate existing token on mount
  useEffect(() => {
    async function verifyExistingAuth() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        const userData = res?.user || res;
        if (userData && userData.id) {
          setUser(userData);
          if (!userData.profileCompleted) {
            setShowOnboarding(true);
          }
        } else {
          logout();
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
    if (!res || !res.user) {
      throw new Error(
        res?.error || 'Authentication verification failed: Backend did not return a user profile. Please verify your Backend URL.'
      );
    }

    if (res.token) {
      localStorage.setItem('chatsphere_auth_token', res.token);
      setToken(res.token);
    }
    setUser(res.user);
    setAuthError(null);

    // If new user or profile incomplete, prompt onboarding
    if (res.isNewUser || !res.user?.profileCompleted) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  };

  /**
   * Login with Email/Username & Password
   */
  const loginWithEmail = async (login, password) => {
    setAuthError(null);
    try {
      const isEmail = login.includes('@');

      if (isFirebaseConfigured() && isEmail) {
        try {
          const fbRes = await signInWithFirebaseEmail(login, password);
          if (fbRes && fbRes.idToken) {
            const res = await api.verifyFirebaseToken(fbRes.idToken);
            handleAuthSuccess(res);
            return res;
          }
        } catch (fbErr) {
          // If Firebase is configured but login fails, try backend direct
        }
      }

      // Backend direct login
      const res = await api.login(login, password);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * Register with complete account information
   */
  const registerWithEmail = async (data) => {
    setAuthError(null);
    try {
      if (isFirebaseConfigured() && data.email && data.password) {
        try {
          const fbRes = await signUpWithFirebaseEmail(
            data.email,
            data.password,
            data.displayName || data.username
          );
          if (fbRes && fbRes.idToken) {
            const res = await api.verifyFirebaseToken(fbRes.idToken, {
              username: data.username,
              displayName: data.displayName,
              mobileNumber: data.mobileNumber,
              gender: data.gender,
              dob: data.dob,
              avatar: data.avatar,
              interests: data.interests
            });
            handleAuthSuccess(res);
            return res;
          }
        } catch (fbErr) {
          // Fallback to backend direct registration
        }
      }

      // Backend direct registration
      const res = await api.register(data);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * Google OAuth Login using Firebase (if available)
   */
  const loginWithGoogleAuth = async () => {
    setAuthError(null);
    try {
      const { idToken, user: gUser } = await signInWithGoogle();
      const res = await api.verifyFirebaseToken(idToken);
      handleAuthSuccess(res);
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * Send Password Reset Email via Firebase
   */
  const resetPassword = async (email) => {
    setAuthError(null);
    try {
      await sendFirebasePasswordReset(email);
      return true;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  /**
   * Update Profile Details
   */
  const updateUserProfile = async (updates) => {
    const res = await api.updateProfile(updates);
    if (res && res.user) {
      setUser(res.user);
      if (res.user.profileCompleted) {
        setShowOnboarding(false);
      }
      return res.user;
    }
    return null;
  };

  /**
   * Delete Account (Permanent, enforced by backend 10-day policy)
   */
  const deleteAccount = async () => {
    const res = await api.deleteAccount();
    await logout();
    return res;
  };

  /**
   * Logout
   */
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
        theme,
        toggleTheme,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogleAuth,
        resetPassword,
        updateUserProfile,
        deleteAccount,
        logout,
        isFirebaseConfigured: isFirebaseConfigured()
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
