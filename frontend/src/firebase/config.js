import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';

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

export const firebaseConfig = customConfig || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDemoPlaceholderChatSphereKey2026",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "chatsphere-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "chatsphere-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "chatsphere-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "102938475610",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:102938475610:web:1234567890abcdef"
};

export const isFirebaseConfigured = () => {
  const cfg = getStoredConfig() || firebaseConfig;
  return (
    cfg.apiKey &&
    !cfg.apiKey.includes('Placeholder') &&
    cfg.projectId &&
    !cfg.projectId.includes('placeholder')
  );
};

let app;
let auth;
let googleProvider;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  console.warn('Firebase initialization warning:', error.message);
}

export { auth, googleProvider, onAuthStateChanged, signOut };

/**
 * Triggers authentic Firebase Google Popup Sign-In
 * Returns Firebase user object and authentic idToken
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    console.info('Using local preview Google OAuth profile. Enter Firebase credentials in Settings to link live Firebase Console.');
    // Simulated token accepted by backend verify endpoint
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
    if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
      throw new Error('Sign-in cancelled. Please try again.');
    }
    if (err.code === 'auth/unauthorized-domain') {
      throw new Error('Unauthorized domain: Please add localhost and 127.0.0.1 to Authorized Domains in Firebase Console -> Authentication -> Settings.');
    }
    console.error('Google Sign-In Popup Error:', err);
    throw err;
  }
}
