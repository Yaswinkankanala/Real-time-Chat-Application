const express = require('express');
const bcrypt = require('bcryptjs');
const {
  users,
  sanitizeUser,
  generateUniqueCode,
  normalizeEmail,
  canonicalizePhone,
  reserveRegistration
} = require('../db');
const { signToken, authMiddleware, verifyFirebaseIdToken } = require('../auth');
const { verifyPhotoStored } = require('../photoValidation');

const router = express.Router();

/**
 * Helper to validate mobile number format (at least 7 to 15 digits)
 */
function isValidPhoneNumber(phone) {
  if (!phone) return false;
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Helper to check if all 8 mandatory fields are satisfied
 */
function checkProfileCompleted(user) {
  if (!user) return false;
  return Boolean(
    user.displayName?.trim() &&
    user.username?.trim() &&
    user.gender?.trim() &&
    user.dob?.trim() &&
    user.mobileNumber?.trim() &&
    user.email?.trim() &&
    verifyPhotoStored(user.avatar) &&
    Array.isArray(user.interests) && user.interests.length > 0
  );
}

/**
 * POST /api/auth/register
 * Register a brand new user with mandatory validations and automatic unique code generation.
 */
router.post('/register', async (req, res) => {
  try {
    const {
      displayName,
      username,
      email,
      password,
      mobileNumber,
      gender,
      dob,
      avatar,
      interests
    } = req.body;

    // 1. Mandatory field checks for account creation
    if (!displayName?.trim()) {
      return res.status(400).json({ error: 'Full Name is required' });
    }
    if (!username?.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    if (!mobileNumber?.trim()) {
      return res.status(400).json({ error: 'Contact number is required' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
    }

    const cleanEmail = normalizeEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const cleanPhone = canonicalizePhone(mobileNumber);
    if (!cleanPhone || !isValidPhoneNumber(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid contact number.' });
    }

    // 2. Prevent duplicate username
    if (users.findByUsername(cleanUsername)) {
      return res.status(400).json({ error: 'This username is already taken by another user.' });
    }

    // 3. Prevent duplicate email (exact required error string)
    if (users.findByEmail(cleanEmail)) {
      return res.status(400).json({
        error: 'This email address is already registered. Please log in instead.'
      });
    }

    // 4. Prevent duplicate contact number (exact required error string)
    if (users.findByMobile(cleanPhone)) {
      return res.status(400).json({
        error: 'This contact number is already registered. Please use a different number.'
      });
    }

    // Concurrency reservation lock: reserve email, phone, and username atomically
    let releaseReservation = null;
    try {
      releaseReservation = reserveRegistration({
        email: cleanEmail,
        phone: cleanPhone,
        username: cleanUsername
      });
    } catch (dupErr) {
      return res.status(400).json({ error: dupErr.message });
    }

    try {
      // 5. Mandatory Profile Photo Check (if avatar was passed during registration)
      let validatedAvatar = '';
      if (avatar && typeof avatar === 'string' && avatar.trim()) {
        if (!verifyPhotoStored(avatar)) {
          return res.status(400).json({ error: 'Profile photo is required. Please upload a photo to continue.' });
        }
        validatedAvatar = avatar.trim();
      }

      // 6. Generate secure password hash
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // 7. Generate automatic permanent unique alphanumeric identification code (e.g. CS8K92A)
      const uniqueCode = generateUniqueCode();

      const cleanInterests = Array.isArray(interests)
        ? interests.map((i) => String(i).trim()).filter(Boolean)
        : [];

      const newUser = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        uniqueCode,
        displayName: displayName.trim(),
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        mobileNumber: cleanPhone,
        gender: gender?.trim() || '',
        dob: dob?.trim() || '',
        avatar: validatedAvatar,
        bio: '',
        interests: cleanInterests,
        notificationsEnabled: true,
        theme: 'dark',
        profileCompleted: false,
        status: 'Active on ChatSphere',
        createdAt: new Date().toISOString()
      };

      // Check if user immediately completed all 8 mandatory fields
      newUser.profileCompleted = checkProfileCompleted(newUser);

      try {
        users.create(newUser);
      } catch (dbErr) {
        if (dbErr.name === 'DuplicateKeyError') {
          return res.status(400).json({ error: dbErr.message });
        }
        throw dbErr;
      }
      const token = signToken(newUser);

      return res.status(201).json({
        message: 'Account registered successfully',
        user: sanitizeUser(newUser, newUser.id),
        token,
        isNewUser: !newUser.profileCompleted
      });
    } finally {
      if (releaseReservation) {
        releaseReservation();
      }
    }
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

/**
 * POST /api/auth/login
 * Log in with Email or Username + Password
 */
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Please enter your username or email, and password' });
    }

    const clean = login.trim().toLowerCase();
    const user = users.findOne(
      (u) =>
        u.username?.toLowerCase() === clean ||
        u.email?.toLowerCase() === clean ||
        u.uniqueCode?.toLowerCase() === clean
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    if (user.passwordHash === 'firebase_oauth_protected' && !password) {
      return res.status(401).json({ error: 'Please sign in using Google OAuth.' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken(user);

    return res.json({
      message: 'Login successful',
      user: sanitizeUser(user, user.id),
      token,
      isNewUser: !user.profileCompleted
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/firebase-config
 * Public Firebase web client credentials for client authentication
 */
router.get('/firebase-config', (req, res) => {
  const config = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyC72CgTdkJHxyskLAIN1urxBY_8_Gi0qD8',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'chatsphere-app-ebc72.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'chatsphere-app-ebc72',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'chatsphere-app-ebc72.firebasestorage.app',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '933541693269',
    appId: process.env.VITE_FIREBASE_APP_ID || '1:933541693269:web:c1b04d110624b55d95d1dc'
  };
  return res.json({ configured: true, config });
});

/**
 * POST /api/auth/verify
 * Firebase OAuth Verification endpoint (optional Google OAuth fallback)
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken, username: requestedUsername, displayName: requestedDisplayName, isSignUp } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ error: 'Verified token must include an email address' });
    }

    const cleanEmail = normalizeEmail(email);
    let user = users.findByFirebaseUid(uid) || users.findByEmail(cleanEmail);

    // If request originates from Sign Up tab and user already exists, reject duplicate registration
    if (isSignUp && user) {
      return res.status(400).json({
        error: 'This email address is already registered. Please log in instead.'
      });
    }

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      let finalUsername = '';

      if (requestedUsername && !users.findByUsername(requestedUsername.trim().toLowerCase())) {
        finalUsername = requestedUsername.trim().toLowerCase();
      } else {
        const base = (requestedDisplayName || name || cleanEmail.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .slice(0, 12);
        const suffix = Math.random().toString(36).substring(2, 6);
        finalUsername = `${base}_${suffix}`;
      }

      const initialAvatar = verifyPhotoStored(picture) ? picture : '';

      user = {
        id: `usr_${uid.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`,
        uniqueCode: generateUniqueCode(),
        firebaseUid: uid,
        username: finalUsername,
        email: cleanEmail,
        displayName: requestedDisplayName || name || finalUsername,
        passwordHash: 'firebase_oauth_protected',
        avatar: initialAvatar,
        dob: '',
        mobileNumber: '',
        gender: '',
        bio: '',
        interests: [],
        notificationsEnabled: true,
        theme: 'dark',
        profileCompleted: false,
        status: 'Active on ChatSphere',
        createdAt: new Date().toISOString()
      };

      try {
        users.create(user);
      } catch (dbErr) {
        if (dbErr.name === 'DuplicateKeyError') {
          return res.status(400).json({ error: dbErr.message });
        }
        throw dbErr;
      }
    } else {
      const updates = {};
      if (!user.firebaseUid) {
        updates.firebaseUid = uid;
      }
      if (!user.uniqueCode) {
        updates.uniqueCode = generateUniqueCode();
      }
      if (!user.avatar && verifyPhotoStored(picture)) {
        updates.avatar = picture;
      }
      if (Object.keys(updates).length > 0) {
        user = users.update(user.id, updates) || user;
      }
      isNewUser = !user.profileCompleted;
    }

    const token = signToken(user);

    return res.json({
      message: 'Authentication verified successfully',
      user: sanitizeUser(user, user.id),
      token,
      isNewUser
    });
  } catch (err) {
    console.error('Firebase token verification error in /api/auth/verify:', err);
    return res.status(401).json({ error: err.message || 'Authentication verification failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authMiddleware, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user, user.id) });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authMiddleware, (req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
module.exports.checkProfileCompleted = checkProfileCompleted;
module.exports.isValidPhoneNumber = isValidPhoneNumber;
