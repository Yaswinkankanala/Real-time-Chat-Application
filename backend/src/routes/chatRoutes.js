const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { users, channels, conversations, messages, sanitizeUser } = require('../db');
const { authMiddleware } = require('../auth');
const { generateSummary } = require('../aiSummary');
const { UPLOADS_DIR, verifyPhotoStored } = require('../photoValidation');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];

  if (allowedMimes.includes(file.mimetype.toLowerCase()) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file format. Please upload JPG, JPEG, PNG, or WEBP image.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to enrich message with sender details
function enrichMessage(msg) {
  const sender = users.findById(msg.senderId);
  return {
    ...msg,
    status: msg.status || 'sent',
    readBy: msg.readBy || [msg.senderId],
    reactions: msg.reactions || {},
    sender: sender
      ? sanitizeUser(sender)
      : {
        id: msg.senderId,
        username: 'Unknown',
        displayName: 'Unknown User',
        avatar: '',
        uniqueCode: ''
      }
  };
}

// All chat routes require authentication
router.use(authMiddleware);

// Middleware: Strictly enforce completed profile before accessing dashboard, chats, and channels
function requireCompletedProfile(req, res, next) {
  const user = users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User account not found' });
  }
  if (!user.profileCompleted) {
    return res.status(403).json({
      error: 'Incomplete registration. You must complete all 8 mandatory profile details before accessing chats, channels, or dashboard.',
      requireProfileCompletion: true
    });
  }
  next();
}

// ==========================================
// 1. FILE & PROFILE PHOTO UPLOAD API
// ==========================================
router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds limit of 5MB. Please upload a smaller image.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    return res.json({
      url: fileUrl,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  });
});

// ==========================================
// 2. USER PROFILE & SEARCH APIS
// ==========================================

// GET /api/users - List users
router.get('/users', requireCompletedProfile, (req, res) => {
  const currentUserId = req.user.id;
  const list = users
    .find((u) => u.id !== currentUserId)
    .map((u) => sanitizeUser(u, currentUserId));
  res.json({ users: list });
});

// GET /api/users/search?q=... - Search registered users by Unique Code or Contact Number
router.get('/users/search', requireCompletedProfile, (req, res) => {
  const { q } = req.query;
  const results = users.search(q, req.user.id);
  res.json({ users: results });
});

// GET /api/users/:id - Get specific user public profile
router.get('/users/:id', requireCompletedProfile, (req, res) => {
  const user = users.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: sanitizeUser(user, req.user.id) });
});

// PUT /api/users/profile - Complete / update mandatory profile details
router.put('/users/profile', (req, res) => {
  const currentUserId = req.user.id;
  const currentUser = users.findById(currentUserId);

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const {
    displayName,
    username,
    email,
    dob,
    mobileNumber,
    gender,
    avatar,
    bio,
    interests,
    notificationsEnabled,
    theme,
    status
  } = req.body;

  const updates = {};

  // 1. Full Name
  if (displayName !== undefined) {
    if (!displayName.trim()) {
      return res.status(400).json({ error: 'Full Name cannot be empty' });
    }
    updates.displayName = displayName.trim();
  }

  // 2. Username (must be unique)
  if (username !== undefined) {
    const cleanUser = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUser || cleanUser.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
    }
    const existing = users.findByUsername(cleanUser);
    if (existing && existing.id !== currentUserId) {
      return res.status(400).json({ error: 'Username is already taken by another user' });
    }
    updates.username = cleanUser;
  }

  // 3. Email (must be unique)
  if (email !== undefined) {
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const existing = users.findByEmail(cleanEmail);
    if (existing && existing.id !== currentUserId) {
      return res.status(400).json({
        error: 'This email address is already registered. Please log in using your existing account.'
      });
    }
    updates.email = cleanEmail;
  }

  // 4. Contact Number (must be unique)
  if (mobileNumber !== undefined) {
    const cleanPhone = mobileNumber.trim();
    const digits = cleanPhone.replace(/[^0-9]/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ error: 'Please enter a valid contact number (7 to 15 digits)' });
    }
    const existing = users.findByMobile(cleanPhone);
    if (existing && existing.id !== currentUserId) {
      return res.status(400).json({
        error: 'This contact number is already registered with another account. Please use a different number.'
      });
    }
    updates.mobileNumber = cleanPhone;
  }

  // 5. Gender
  if (gender !== undefined) {
    updates.gender = gender.trim();
  }

  // 6. Date of Birth
  if (dob !== undefined) {
    updates.dob = dob.trim();
  }

  // 7. Profile Photo (compulsory validation)
  if (avatar !== undefined) {
    if (avatar && !verifyPhotoStored(avatar)) {
      return res.status(400).json({ error: 'Profile photo is required. Please upload a photo to continue.' });
    }
    updates.avatar = avatar.trim();
  }

  // 8. Interests
  if (interests !== undefined && Array.isArray(interests)) {
    updates.interests = interests.map((i) => String(i).trim()).filter(Boolean);
  }

  // Optional status & bio
  if (bio !== undefined) updates.bio = bio.trim();
  if (status !== undefined) updates.status = status.trim();

  // Settings: Notifications & Theme
  if (notificationsEnabled !== undefined) {
    updates.notificationsEnabled = Boolean(notificationsEnabled);
  }
  if (theme !== undefined && ['dark', 'light'].includes(theme)) {
    updates.theme = theme;
  }

  // Check if all 8 mandatory fields are complete
  const finalName = updates.displayName || currentUser.displayName;
  const finalUser = updates.username || currentUser.username;
  const finalEmail = updates.email || currentUser.email;
  const finalPhone = updates.mobileNumber || currentUser.mobileNumber;
  const finalGender = updates.gender || currentUser.gender;
  const finalDob = updates.dob || currentUser.dob;
  const finalAvatar = updates.avatar || currentUser.avatar;
  const finalInterests = updates.interests || currentUser.interests;

  // If user was not yet completed, explicitly validate all 8 fields with clear messages
  if (!currentUser.profileCompleted) {
    if (!finalName?.trim()) return res.status(400).json({ error: 'Full Name is mandatory.' });
    if (!finalUser?.trim()) return res.status(400).json({ error: 'Username is mandatory.' });
    if (!finalGender?.trim()) return res.status(400).json({ error: 'Gender is mandatory.' });
    if (!finalDob?.trim()) return res.status(400).json({ error: 'Date of Birth is mandatory.' });
    if (!finalPhone?.trim()) return res.status(400).json({ error: 'Contact Number is mandatory.' });
    if (!finalEmail?.trim()) return res.status(400).json({ error: 'Email Address is mandatory.' });
    if (!verifyPhotoStored(finalAvatar)) {
      return res.status(400).json({ error: 'Profile photo is required. Please upload a photo to continue.' });
    }
    if (!Array.isArray(finalInterests) || finalInterests.length === 0) {
      return res.status(400).json({ error: 'Interests must contain at least one selection.' });
    }
  }

  const isAllComplete = Boolean(
    finalName?.trim() &&
    finalUser?.trim() &&
    finalEmail?.trim() &&
    finalPhone?.trim() &&
    finalGender?.trim() &&
    finalDob?.trim() &&
    verifyPhotoStored(finalAvatar) &&
    Array.isArray(finalInterests) && finalInterests.length > 0
  );

  updates.profileCompleted = isAllComplete;

  // Explicit protection: Unique identification code and creation date can never be changed
  delete updates.uniqueCode;
  delete updates.createdAt;
  delete updates.id;

  try {
    const updatedUser = users.update(currentUserId, updates);
    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(updatedUser, currentUserId)
    });
  } catch (err) {
    if (err.name === 'DuplicateKeyError') {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

// DELETE /api/users/account - Delete user account with 10-day restriction
router.delete('/users/account', (req, res) => {
  const currentUserId = req.user.id;
  const currentUser = users.findById(currentUserId);

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const createdTime = new Date(currentUser.createdAt || Date.now()).getTime();
  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - createdTime;

  // Enforce 10-day restriction on the backend
  if (elapsedMs < TEN_DAYS_MS) {
    const remainingMs = TEN_DAYS_MS - elapsedMs;
    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    return res.status(403).json({
      error: `Account deletion is protected. You can delete your account after 10 days of creation. Remaining time: ${remainingDays}d ${remainingHours}h ${remainingMins}m.`,
      remainingDays,
      remainingHours,
      remainingMins,
      canDelete: false
    });
  }

  // Process deletion
  users.delete(currentUserId);

  return res.json({
    message: 'Your ChatSphere account has been permanently deleted.',
    deleted: true
  });
});

// ==========================================
// 3. CONVERSATIONS (1-to-1) APIS
// ==========================================

// GET /api/conversations - List all direct conversations
router.get('/conversations', requireCompletedProfile, (req, res) => {
  const currentUserId = req.user.id;
  const userConvs = conversations.findForUser(currentUserId);

  const enrichedConvs = userConvs
    .map((conv) => {
      const otherUserId = conv.participants.find((id) => id !== currentUserId) || currentUserId;
      const otherUser = users.findById(otherUserId);

      // Calculate unread count
      const unreadCount = messages
        .find((m) => m.conversationId === conv.id && m.recipientId === currentUserId && m.status !== 'read')
        .length;

      return {
        id: conv.id,
        otherUser: otherUser ? sanitizeUser(otherUser, currentUserId) : null,
        lastMessage: conv.lastMessage ? enrichMessage(conv.lastMessage) : null,
        unreadCount,
        updatedAt: conv.updatedAt
      };
    })
    .filter((c) => c.otherUser !== null)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  res.json({ conversations: enrichedConvs });
});

// POST /api/conversations - Find or create 1-to-1 conversation
router.post('/conversations', requireCompletedProfile, (req, res) => {
  const { targetUserId } = req.body;
  const currentUserId = req.user.id;

  if (!targetUserId) {
    return res.status(400).json({ error: 'targetUserId is required' });
  }

  const targetUser = users.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user does not exist' });
  }

  const conv = conversations.findOrCreate(currentUserId, targetUserId);

  res.json({
    conversation: {
      id: conv.id,
      otherUser: sanitizeUser(targetUser, currentUserId),
      lastMessage: conv.lastMessage ? enrichMessage(conv.lastMessage) : null,
      unreadCount: 0,
      createdAt: conv.createdAt
    }
  });
});

// GET /api/conversations/:targetUserId/messages - Get 1-to-1 message history
router.get('/conversations/:targetUserId/messages', requireCompletedProfile, (req, res) => {
  const currentUserId = req.user.id;
  const { targetUserId } = req.params;

  const conv = conversations.findOrCreate(currentUserId, targetUserId);

  // Mark received messages as read
  const convMsgs = messages
    .find((m) => m.conversationId === conv.id)
    .map((m) => {
      if (m.recipientId === currentUserId && m.status !== 'read') {
        m.status = 'read';
        if (!m.readBy) m.readBy = [];
        if (!m.readBy.includes(currentUserId)) m.readBy.push(currentUserId);
        messages.update(m.id, { status: 'read', readBy: m.readBy });
      }
      return enrichMessage(m);
    })
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    conversationId: conv.id,
    messages: convMsgs
  });
});

/**
 * POST /api/conversations/:idOrTargetUserId/summarize
 * AI Chat Summary - EXCLUSIVELY for 1-to-1 Personal Conversations
 * 
 * Strict Privacy & Scope Protections:
 * - Only 1-to-1 direct chats can be summarized (channels are rejected).
 * - Verified participant authentication required.
 * - Cannot access other users' conversations.
 * - Does NOT send messages or participate in chats.
 */
router.post('/conversations/:idOrTargetUserId/summarize', requireCompletedProfile, async (req, res) => {
  const currentUserId = req.user.id;
  const { idOrTargetUserId } = req.params;

  // Resolve conversation by ID or participant user ID
  let conv = conversations.findById(idOrTargetUserId);
  if (!conv) {
    conv = conversations.findByParticipants(currentUserId, idOrTargetUserId);
  }
  if (!conv) {
    conv = conversations.findOrCreate(currentUserId, idOrTargetUserId);
  }

  // Security check: Must exist and requesting user must be an active participant
  if (!conv || !Array.isArray(conv.participants) || !conv.participants.includes(currentUserId)) {
    return res.status(403).json({
      error: 'Access denied: You can only summarize personal conversations that you participate in.'
    });
  }

  // Security check: Explicitly reject channels if somehow requested
  if (conv.isChannel || conv.channelId) {
    return res.status(400).json({
      error: 'AI Chat Summary is only permitted for one-to-one personal conversations.'
    });
  }

  const otherUserId = conv.participants.find((p) => p !== currentUserId) || currentUserId;
  const otherUser = users.findById(otherUserId);
  const currentUser = users.findById(currentUserId);

  // Retrieve strictly 1-to-1 conversation messages (never channels)
  const convMsgs = messages
    .find((m) => m.conversationId === conv.id && !m.channelId)
    .map(enrichMessage)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (convMsgs.length === 0) {
    return res.json({
      empty: true,
      conversationId: conv.id,
      message: 'There are no messages available to summarize yet.'
    });
  }

  try {
    const summary = await generateSummary(
      convMsgs,
      otherUser?.displayName || otherUser?.username || 'Friend',
      currentUser?.displayName || currentUser?.username || 'You'
    );

    return res.json({
      success: true,
      conversationId: conv.id,
      otherUser: otherUser ? sanitizeUser(otherUser, currentUserId) : null,
      summary
    });
  } catch (err) {
    console.error('AI summary error:', err);
    return res.status(500).json({ error: 'Failed to generate conversation summary. Please try again.' });
  }
});

// ==========================================
// 4. CHANNELS MANAGEMENT APIS
// ==========================================

// GET /api/channels - List channels (Vignan + User-created)
router.get('/channels', requireCompletedProfile, (req, res) => {
  const currentUserId = req.user.id;

  const list = channels.find().map((c) => {
    const isMember = channels.isMember(c.id, currentUserId);
    const isOwner = c.ownerId === currentUserId;

    return {
      id: c.id,
      name: c.name,
      description: c.description || '',
      isPrivate: !!c.isPrivate,
      icon: c.icon || (c.isPrivate ? '🔒' : '💬'),
      ownerId: c.ownerId,
      isMember,
      isOwner,
      // Never expose private channel passcodes publicly; only owner can view
      passcode: isOwner ? c.passcode : undefined,
      memberCount: Array.isArray(c.members) ? c.members.length : 0,
      createdAt: c.createdAt
    };
  });

  res.json({ channels: list });
});

// POST /api/channels - Create a public or private channel
router.post('/channels', requireCompletedProfile, (req, res) => {
  const { name, description, isPrivate, passcode, icon } = req.body;
  const currentUserId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  const cleanName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 30);

  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Channel name must be at least 2 characters' });
  }

  // Prevent duplicate channel names
  const existing = channels.findOne((c) => c.name.toLowerCase() === cleanName);
  if (existing) {
    return res.status(400).json({ error: 'A channel with this name already exists' });
  }

  let finalPasscode = null;
  let passcodeHash = null;

  if (isPrivate) {
    if (!passcode || !passcode.trim()) {
      return res.status(400).json({ error: 'A passcode is mandatory for creating a private channel' });
    }
    finalPasscode = passcode.trim();
    passcodeHash = bcrypt.hashSync(finalPasscode, 8);
  }

  const newChannel = {
    id: `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    description: description ? description.trim() : '',
    isPrivate: Boolean(isPrivate),
    passcodeHash,
    icon: icon || (isPrivate ? '🔒' : '💬'),
    ownerId: currentUserId,
    members: [currentUserId], // Creator is the first member
    createdAt: new Date().toISOString()
  };

  channels.create(newChannel);

  res.status(201).json({
    message: 'Channel created successfully',
    channel: {
      id: newChannel.id,
      name: newChannel.name,
      description: newChannel.description,
      isPrivate: newChannel.isPrivate,
      icon: newChannel.icon,
      ownerId: newChannel.ownerId,
      isMember: true,
      isOwner: true,
      passcode: finalPasscode, // returned to creator once
      memberCount: 1,
      createdAt: newChannel.createdAt
    }
  });
});

// POST /api/channels/:id/join - Join public or private channel with passcode validation
router.post('/channels/:id/join', requireCompletedProfile, (req, res) => {
  const { id } = req.params;
  const { passcode } = req.body;
  const currentUserId = req.user.id;

  const channel = channels.findById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // If already member, return success
  if (channels.isMember(id, currentUserId)) {
    return res.json({
      message: 'Already a member of this channel',
      channel: {
        id: channel.id,
        name: channel.name,
        isPrivate: channel.isPrivate,
        isMember: true
      }
    });
  }

  // If private, validate passcode (Vignan channel: 1299)
  if (channel.isPrivate) {
    if (!passcode || !passcode.trim()) {
      return res.status(400).json({ error: 'Passcode is mandatory to join this private channel' });
    }

    const cleanInput = passcode.trim();
    let isMatch = false;

    if (channel.passcodeHash) {
      isMatch = bcrypt.compareSync(cleanInput, channel.passcodeHash);
    }
    if (!isMatch && channel.passcode) {
      isMatch = channel.passcode === cleanInput;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect passcode. Please try again.' });
    }
  }

  channels.addMember(id, currentUserId);

  res.json({
    message: 'Successfully joined channel',
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      isMember: true,
      memberCount: channel.members.length
    }
  });
});

// POST /api/channels/:id/leave - Leave a channel
router.post('/channels/:id/leave', requireCompletedProfile, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  const channel = channels.findById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  channels.removeMember(id, currentUserId);

  res.json({
    message: 'Left channel successfully',
    channelId: id
  });
});

// GET /api/channels/:id/messages - Get channel message stream
router.get('/channels/:id/messages', requireCompletedProfile, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  const channel = channels.findById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.isPrivate && !channels.isMember(id, currentUserId)) {
    return res.status(403).json({ error: 'Passcode required. You must join this channel first.' });
  }

  const chanMsgs = messages
    .find((m) => m.channelId === id)
    .map(enrichMessage)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({
    channelId: id,
    messages: chanMsgs
  });
});

// GET /api/channels/:id - Get channel details
router.get('/channels/:id', requireCompletedProfile, (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  const channel = channels.findById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const isOwner = channel.ownerId === currentUserId;
  const isMember = channels.isMember(id, currentUserId);

  res.json({
    channel: {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.isPrivate,
      icon: channel.icon,
      ownerId: channel.ownerId,
      isMember,
      isOwner,
      passcode: isOwner ? channel.passcode : undefined,
      memberCount: Array.isArray(channel.members) ? channel.members.length : 0,
      createdAt: channel.createdAt
    }
  });
});

// DELETE /api/channels/:id - Delete a channel (owner only)
router.delete('/channels/:id', (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  const channel = channels.findById(id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // Prevent deleting Vignan channel
  if (channel.name.toLowerCase() === 'vignan') {
    return res.status(403).json({ error: 'The Vignan channel is protected and cannot be deleted.' });
  }

  if (channel.ownerId !== currentUserId) {
    return res.status(403).json({ error: 'Only the channel creator can delete this channel.' });
  }

  channels.delete(id);
  res.json({ message: 'Channel deleted successfully' });
});

module.exports = {
  router,
  enrichMessage
};
