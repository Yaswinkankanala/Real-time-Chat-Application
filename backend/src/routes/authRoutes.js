const express = require('express');
const bcrypt = require('bcryptjs');
const { users, sanitizeUser } = require('../db');
const { signToken, authMiddleware, verifyFirebaseIdToken } = require('../auth');

const router = express.Router();

/**
 * POST /api/auth/verify
 * Secure Firebase Google Authentication Verification endpoint
 * Does NOT trust client-supplied user profile directly — verifies the Firebase ID token!
 */
router.post('/verify', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    // Verify token using Firebase Admin SDK (or fallback in local development)
    const decoded = await verifyFirebaseIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ error: 'Verified Firebase token must include an email address' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = users.findByFirebaseUid(uid) || users.findByEmail(cleanEmail);

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const baseUsername = (name || cleanEmail.split('@')[0])
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 15);
      
      const uniqueSuffix = Math.random().toString(36).substring(2, 6);
      const username = `${baseUsername}_${uniqueSuffix}`;

      user = {
        id: `usr_${uid.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`,
        firebaseUid: uid,
        username,
        email: cleanEmail,
        displayName: name || username,
        passwordHash: 'firebase_oauth_protected',
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanEmail}`,
        dob: '',
        mobileNumber: '',
        gender: '',
        bio: 'Hey there! I am using ChatSphere.',
        location: '',
        interests: ['ChatSphere'],
        privacy: { showDob: false, showMobile: false, showLocation: true },
        profileCompleted: false, // Triggers initial profile completion flow
        status: 'Available on ChatSphere',
        createdAt: new Date().toISOString()
      };

      users.create(user);
    } else {
      // If user existed without firebaseUid, link it
      const updates = {};
      if (!user.firebaseUid) updates.firebaseUid = uid;
      if (picture && (!user.avatar || user.avatar.includes('dicebear'))) updates.avatar = picture;
      if (Object.keys(updates).length > 0) {
        user = users.update(user.id, updates);
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
    return res.status(401).json({ error: err.message || 'Firebase ID token verification failed' });
  }
});

// Standard Login
router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const clean = login.trim().toLowerCase();
    const user = users.findOne((u) => u.username?.toLowerCase() === clean || u.email?.toLowerCase() === clean);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isAgent) {
      return res.status(403).json({ error: 'System AI bot cannot be logged into directly' });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
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

// Standard Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (users.findByUsername(cleanUsername)) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    if (users.findByEmail(cleanEmail)) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName?.trim() || cleanUsername,
      passwordHash,
      avatar: avatar?.trim() || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      dob: '',
      mobileNumber: '',
      gender: '',
      bio: 'New member of ChatSphere!',
      location: '',
      interests: [],
      privacy: { showDob: false, showMobile: false, showLocation: true },
      profileCompleted: false,
      status: 'Available',
      createdAt: new Date().toISOString()
    };

    users.create(newUser);
    const token = signToken(newUser);

    return res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(newUser, newUser.id),
      token,
      isNewUser: true
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Current User Profile
router.get('/me', authMiddleware, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user: sanitizeUser(user, user.id) });
});

// Logout
router.post('/logout', authMiddleware, (req, res) => {
  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;
