import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

// Read custom stored config if user provided one in app settings
const getStoredConfig = () => {
  try {
    const custom = localStorage.getItem('chatsphere_firebase_custom_config');
    if (custom) return JSON.parse(custom);
  } catch (e) {
    // Ignore JSON errors
  }
  return null;
};

const customConfig = getStoredConfig();

export let firebaseConfig = customConfig || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoPlaceholderChatSphereKey2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chatsphere-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chatsphere-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chatsphere-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:1234567890abcdef"
};

export const isFirebaseConfigured = () => {
  const cfg = getStoredConfig() || firebaseConfig;
  return Boolean(
    cfg &&
    cfg.apiKey &&
    !cfg.apiKey.includes('Placeholder') &&
    cfg.projectId &&
    !cfg.projectId.includes('placeholder')
  );
};

let app;
let auth;
let googleProvider;

export function initializeFirebase(config = firebaseConfig) {
  try {
    app = !getApps().length ? initializeApp(config) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.warn('Firebase initialization warning:', error.message);
  }
}

// Initial setup
initializeFirebase();

// Try to auto-load backend Firebase config if local is default placeholder
if (typeof window !== 'undefined' && !isFirebaseConfigured()) {
  const isDev = window.location.port === '5173' || window.location.port === '3000';
  const apiUrl = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5000/api' : `${window.location.origin}/api`);
  
  fetch(`${apiUrl}/auth/firebase-config`)
    .then((r) => r.json())
    .then((data) => {
      if (data && data.configured && data.config) {
        console.log('⚡ Loaded live Firebase credentials from backend environment');
        localStorage.setItem('chatsphere_firebase_custom_config', JSON.stringify(data.config));
        firebaseConfig = data.config;
        initializeFirebase(data.config);
      }
    })
    .catch(() => {
      // Ignore background config check failure
    });
}

export { auth, googleProvider, onAuthStateChanged, signOut };

/**
 * Friendly error translator for Firebase Auth exceptions
 */
export function formatFirebaseAuthError(err) {
  const code = err.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was closed before completing. Please try again.';
    case 'auth/unauthorized-domain':
      return 'Unauthorized domain: Add this domain (or localhost) in Firebase Console -> Authentication -> Settings -> Authorized Domains.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please sign in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to many failed attempts. Try again later.';
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled in Firebase Console. Please enable Email/Password or Google.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    default:
      return err.message || 'Authentication failed. Please try again.';
  }
}

/**
 * Authentic Firebase Google Popup Sign-In
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    console.info('Using local preview Google OAuth profile. Enter Firebase credentials in Settings to link live Firebase Console.');
    return {
      isSimulated: true,
      idToken: 'simulated_dev_token_' + Math.random().toString(36).substring(2, 9),
      user: {
        uid: 'google_dev_' + Math.random().toString(36).substring(2, 8),
        email: 'developer.google@chatsphere.io',
        displayName: 'Google Dev User',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    };
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      isSimulated: false,
      idToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.email}`
      }
    };
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw new Error(formatFirebaseAuthError(err));
  }
}

/**
 * Authentic Firebase Email & Password Sign-In
 */
export async function signInWithFirebaseEmail(email, password) {
  if (!isFirebaseConfigured()) {
    return null; // Signals caller to use backend fallback
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await userCredential.user.getIdToken();
    return {
      idToken,
      user: userCredential.user
    };
  } catch (err) {
    console.error('Firebase Email Sign-In Error:', err);
    throw new Error(formatFirebaseAuthError(err));
  }
}

/**
 * Authentic Firebase Email & Password Registration
 */
export async function signUpWithFirebaseEmail(email, password, displayName = '') {
  if (!isFirebaseConfigured()) {
    return null; // Signals caller to use backend fallback
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName }).catch(() => {});
    }
    const idToken = await userCredential.user.getIdToken();
    return {
      idToken,
      user: userCredential.user
    };
  } catch (err) {
    console.error('Firebase Email Sign-Up Error:', err);
    throw new Error(formatFirebaseAuthError(err));
  }
}

/**
 * Send Firebase Password Reset Email
 */
export async function sendFirebasePasswordReset(email) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured yet. Set your Firebase project keys first.');
  }

  try {
    await sendPasswordResetEmail(auth, email.trim());
    return true;
  } catch (err) {
    console.error('Firebase Password Reset Error:', err);
    throw new Error(formatFirebaseAuthError(err));
  }
}
