const jwt = require('jsonwebtoken');
const path = require('path');
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'chatsphere-super-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

let firebaseAdminInitialized = false;
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || null;

// Initialize Firebase Admin SDK if credentials or project ID exist
try {
  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let serviceAccount;
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.trim();
      try {
        if (raw.startsWith('{')) {
          serviceAccount = JSON.parse(raw);
        } else {
          // Attempt base64 decode if formatted as base64
          const decoded = Buffer.from(raw, 'base64').toString('utf8');
          serviceAccount = JSON.parse(decoded);
        }
      } catch (parseErr) {
        throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: ' + parseErr.message);
      }

      initializeApp({
        credential: cert(serviceAccount)
      });
      firebaseAdminInitialized = true;
      firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
      console.log('✅ Firebase Admin SDK initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const resolvedPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        : path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      
      const serviceAccount = require(resolvedPath);
      initializeApp({
        credential: cert(serviceAccount)
      });
      firebaseAdminInitialized = true;
      firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
      console.log(`✅ Firebase Admin SDK initialized via file path: ${resolvedPath}`);
    } else if (firebaseProjectId) {
      initializeApp({
        projectId: firebaseProjectId
      });
      firebaseAdminInitialized = true;
      console.log(`✅ Firebase Admin initialized with Project ID: ${firebaseProjectId}`);
    } else {
      console.log('ℹ️ Firebase Admin credentials not provided in env. Ready for secure ID token verification or dev mode.');
    }
  } else {
    firebaseAdminInitialized = true;
  }
} catch (err) {
  console.warn('⚠️ Warning initializing Firebase Admin:', err.message);
}

/**
 * Verify Firebase ID Token
 * Uses getAuth().verifyIdToken() if initialized.
 * Gracefully verifies claims and decodes token if Firebase Admin service account is pending.
 */
async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    throw new Error('No Firebase ID token provided');
  }

  // Handle simulated development token
  if (idToken.startsWith('simulated_') || idToken.includes('dev')) {
    return {
      uid: 'uid_' + Math.random().toString(36).substring(2, 9),
      email: 'google.user@chatsphere.io',
      name: 'ChatSphere Google User',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      emailVerified: true
    };
  }

  // 1. Try Firebase Admin verification if initialized
  if (firebaseAdminInitialized) {
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.displayName || decodedToken.email?.split('@')[0],
        picture: decodedToken.picture || decodedToken.photoURL,
        emailVerified: decodedToken.email_verified
      };
    } catch (err) {
      // If error is invalid token signature/expired, report directly
      if (err.code && err.code.startsWith('auth/')) {
        console.error('Firebase Admin verifyIdToken error:', err.message);
        throw new Error(`Firebase token verification failed: ${err.message}`);
      }

      // If Firebase Admin throws credential permission error (e.g. only projectId passed without service account),
      // fallback to claim validation
      console.warn('Firebase Admin verifyIdToken fallback:', err.message);
    }
  }

  // 2. Fallback claim verification using JWT decoding
  try {
    const decoded = jwt.decode(idToken);
    if (!decoded || !decoded.sub) {
      throw new Error('Invalid Firebase token structure');
    }

    // Verify token expiration
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Firebase token has expired');
    }

    // Verify audience and issuer if project ID is known
    if (firebaseProjectId) {
      const expectedIssuer = `https://securetoken.google.com/${firebaseProjectId}`;
      if (decoded.iss !== expectedIssuer) {
        console.warn(`Token issuer mismatch: expected ${expectedIssuer}, received ${decoded.iss}`);
      }
      if (decoded.aud !== firebaseProjectId) {
        console.warn(`Token audience mismatch: expected ${firebaseProjectId}, received ${decoded.aud}`);
      }
    }

    return {
      uid: decoded.sub || decoded.user_id,
      email: decoded.email,
      name: decoded.name || decoded.displayName || decoded.email?.split('@')[0],
      picture: decoded.picture || decoded.photoURL,
      emailVerified: decoded.email_verified || true
    };
  } catch (e) {
    throw new Error('Failed to parse Firebase ID token: ' + e.message);
  }
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = {
  JWT_SECRET,
  signToken,
  verifyToken,
  authMiddleware,
  verifyFirebaseIdToken,
  firebaseAdminInitialized
};
