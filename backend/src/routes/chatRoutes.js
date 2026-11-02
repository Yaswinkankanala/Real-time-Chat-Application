const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { users, channels, conversations, messages, sanitizeUser } = require('../db');
const { authMiddleware } = require('../auth');
const { getAgentReply, generateSmartReplies, summarizeChat, AI_AGENT_PROFILE } = require('../aiAgent');

const router = express.Router();

// Setup Multer for attachment uploads
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
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
        isAgent: false
      }
  };
}

// Helper to generate secure random channel passcode
function generateChannelPasscode() {
  const prefix = 'CS';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
}

// All chat routes require authentication
router.use(authMiddleware);

// ==========================================
// 1. USER PROFILE & SEARCH APIS
// ==========================================

// GET /api/users - List all users (sanitized for privacy)
router.get('/users', (req, res) => {
  const currentUserId = req.user.id;
  const list = users
    .find((u) => u.id !== currentUserId)
    .map((u) => sanitizeUser(u, currentUserId));
  res.json({ users: list });
});

// GET /api/users/search?q=... - Search users
router.get('/users/search', (req, res) => {
  const { q } = req.query;
  const results = users.search(q, req.user.id);
  res.json({ users: results });
});

// GET /api/users/:id - Get specific user public profile
router.get('/users/:id', (req, res) => {
  const user = users.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: sanitizeUser(user, req.user.id) });
});

// PUT /api/users/profile - Complete onboarding / update profile
router.put('/users/profile', (req, res) => {
  const currentUserId = req.user.id;
  const currentUser = users.findById(currentUserId);

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const {
    displayName,
    username,
    dob,
    mobileNumber,
    gender,
    avatar,
    bio,
    location,
    interests,
    privacy,
    status
  } = req.body;

  const updates = {};

  // Display Name
  if (displayName !== undefined) {
    if (!displayName.trim()) {
      return res.status(400).json({ error: 'Display name cannot be empty' });
    }
    updates.displayName = displayName.trim();
  }

  // Username validation (must be unique)
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

  // Mobile number validation (international format e.g. +14155552671)
  if (mobileNumber !== undefined && mobileNumber !== '') {
    const cleanPhone = mobileNumber.trim();
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid international mobile number (e.g. +14155552671)' });
    }
    updates.mobileNumber = cleanPhone;
  }

  // Date of Birth validation
  if (dob !== undefined) {
    updates.dob = dob.trim();
  }

  // Gender
  if (gender !== undefined) {
    updates.gender = gender.trim();
  }

  // Avatar
  if (avatar !== undefined) updates.avatar = avatar.trim();

  // Bio, Location, Status
  if (bio !== undefined) updates.bio = bio.trim();
  if (location !== undefined) updates.location = location.trim();
  if (status !== undefined) updates.status = status.trim();

  // Interests array
  if (interests !== undefined && Array.isArray(interests)) {
    updates.interests = interests.map((i) => String(i).trim()).filter(Boolean);
  }

  // Privacy controls
  if (privacy && typeof privacy === 'object') {
    updates.privacy = {
      ...(currentUser.privacy || {}),
      ...privacy
    };
  }

  // Determine if profile is completed
  const finalDob = updates.dob !== undefined ? updates.dob : currentUser.dob;
  const finalMobile = updates.mobileNumber !== undefined ? updates.mobileNumber : currentUser.mobileNumber;
  const finalGender = updates.gender !== undefined ? updates.gender : currentUser.gender;

  if (finalDob && finalMobile && finalGender) {
    updates.profileCompleted = true;
  }

  const updatedUser = users.update(currentUserId, updates);

  res.json({
    message: 'Profile updated successfully',
    user: sanitizeUser(updatedUser, currentUserId)
  });
});

// ==========================================
// 2. CONVERSATIONS (1-to-1) APIS
// ==========================================

// GET /api/conversations - List all direct conversations
router.get('/conversations', (req, res) => {
  const currentUserId = req.user.id;
  const userConvs = conversations.findForUser(currentUserId);

  const enrichedConvs = userConvs.map((conv) => {
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
  }).filter((c) => c.otherUser !== null);

  // Always ensure Nova AI is in conversations or readily discoverable
  const hasAi = enrichedConvs.some((c) => c.otherUser?.id === 'usr_nova_ai');
  if (!hasAi) {
    const aiUser = users.findById('usr_nova_ai');
    if (aiUser) {
      enrichedConvs.unshift({
        id: `conv_${[currentUserId, 'usr_nova_ai'].sort().join('_')}`,
        otherUser: sanitizeUser(aiUser, currentUserId),
        lastMessage: {
          id: 'welcome_ai',
          content: 'Hello! Ask me anything or request conversation summaries anytime ✨',
          createdAt: new Date().toISOString()
        },
        unreadCount: 0,
        updatedAt: new Date().toISOString()
      });
    }
  }

  res.json({ conversations: enrichedConvs });
});

// POST /api/conversations - Find or create 1-to-1 conversation
router.post('/conversations', (req, res) => {
  const { targetUserId } = req.body;
  const currentUserId = req.user.id;

  if (!targetUserId) {
    return res.status(400).json({ error: 'Target user ID is required' });
  }

  const targetUser = users.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user does not exist' });
  }

  const conv = conversations.findOrCreate(currentUserId, targetUserId);

  res.status(201).json({
    conversation: {
      ...conv,
      otherUser: sanitizeUser(targetUser, currentUserId)
    }
  });
});

// GET /api/conversations/:id/messages - Get messages for conversation
router.get('/conversations/:id/messages', (req, res) => {
  const convId = req.params.id;
  const currentUserId = req.user.id;

  const conv = conversations.findById(convId);
  if (!conv || !conv.participants.includes(currentUserId)) {
    return res.status(403).json({ error: 'Access denied to this conversation' });
  }

  const convMessages = messages
    .find((m) => m.conversationId === convId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(enrichMessage);

  res.json({ messages: convMessages });
});

// ==========================================
// 3. MESSAGES APIS
// ==========================================

// POST /api/messages - Send message via REST
router.post('/messages', (req, res) => {
  const { channelId, recipientId, content, attachment } = req.body;
  const currentUserId = req.user.id;

  if (!content?.trim() && !attachment) {
    return res.status(400).json({ error: 'Message content or attachment is required' });
  }

  if (channelId) {
    // Check channel membership
    if (!channels.isMember(channelId, currentUserId)) {
      return res.status(403).json({ error: 'You are not a member of this channel' });
    }
  }

  let conversationId = null;
  if (recipientId) {
    const conv = conversations.findOrCreate(currentUserId, recipientId);
    conversationId = conv.id;
  }

  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    channelId: channelId || null,
    conversationId,
    recipientId: recipientId || null,
    senderId: currentUserId,
    content: content ? content.trim() : '',
    attachment: attachment || null,
    status: 'sent',
    readBy: [currentUserId],
    reactions: {},
    createdAt: new Date().toISOString()
  };

  messages.create(newMsg);

  if (conversationId) {
    conversations.update(conversationId, { lastMessage: newMsg });
  }

  res.status(201).json({ message: enrichMessage(newMsg) });
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/messages/:id/read', (req, res) => {
  const msgId = req.params.id;
  const currentUserId = req.user.id;

  const msg = messages.findById(msgId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const readBy = msg.readBy || [];
  if (!readBy.includes(currentUserId)) {
    readBy.push(currentUserId);
  }

  const updated = messages.update(msgId, {
    status: 'read',
    readBy
  });

  res.json({ message: enrichMessage(updated) });
});

// ==========================================
// 4. CHANNELS WITH PASSCODES APIS
// ==========================================

// GET /api/channels - List accessible channels
router.get('/channels', (req, res) => {
  const currentUserId = req.user.id;
  const allChannels = channels.find();

  // Return public channels + private channels where current user is a member
  const accessibleChannels = allChannels.map((c) => {
    const isMember = channels.isMember(c.id, currentUserId);
    const isOwner = c.ownerId === currentUserId;
    const msgCount = messages.find((m) => m.channelId === c.id).length;

    return {
      id: c.id,
      name: c.name,
      description: c.description,
      isPrivate: !!c.isPrivate,
      icon: c.icon || (c.isPrivate ? '🔒' : '💬'),
      ownerId: c.ownerId,
      isOwner,
      isMember,
      memberCount: (c.members || []).length,
      // Only disclose passcode to the channel owner
      passcode: isOwner ? c.passcode : undefined,
      messageCount: msgCount,
      createdAt: c.createdAt
    };
  });

  res.json({ channels: accessibleChannels });
});

// POST /api/channels - Create new channel
router.post('/channels', (req, res) => {
  const { name, description, isPrivate, icon, passcode: customPasscode } = req.body;
  const currentUserId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Channel name is required' });
  }

  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');

  if (channels.findOne((c) => c.name === cleanName)) {
    return res.status(400).json({ error: 'A channel with this name already exists' });
  }

  let finalPasscode = null;
  let passcodeHash = null;

  if (isPrivate) {
    finalPasscode = customPasscode?.trim() || generateChannelPasscode();
    passcodeHash = bcrypt.hashSync(finalPasscode, 8);
  }

  const newChannel = {
    id: `chan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    description: description?.trim() || '',
    isPrivate: !!isPrivate,
    passcode: finalPasscode,
    passcodeHash,
    icon: icon || (isPrivate ? '🔒' : '💬'),
    ownerId: currentUserId,
    members: [currentUserId], // Creator automatically becomes owner and first member!
    createdAt: new Date().toISOString()
  };

  channels.create(newChannel);

  res.status(201).json({
    message: 'Channel created successfully',
    channel: {
      ...newChannel,
      isOwner: true,
      isMember: true,
      memberCount: 1,
      passcode: finalPasscode
    }
  });
});

// POST /api/channels/join - Join channel (validates passcode for private channels)
router.post('/channels/join', (req, res) => {
  const { channelId, passcode } = req.body;
  const currentUserId = req.user.id;

  if (!channelId) {
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  const channel = channels.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  // Already a member?
  if (channel.members && channel.members.includes(currentUserId)) {
    return res.json({
      message: 'You are already a member of this channel',
      channel
    });
  }

  // Check passcode if private
  if (channel.isPrivate) {
    if (!passcode || !passcode.trim()) {
      return res.status(403).json({ error: 'This is a private channel. A valid passcode is required to join.' });
    }

    const cleanInput = passcode.trim();
    const isDirectMatch = channel.passcode && channel.passcode === cleanInput;
    const isHashMatch = channel.passcodeHash && bcrypt.compareSync(cleanInput, channel.passcodeHash);

    if (!isDirectMatch && !isHashMatch) {
      return res.status(403).json({ error: 'Invalid channel passcode. Please check and try again.' });
    }
  }

  // Add member
  channels.addMember(channelId, currentUserId);

  res.json({
    message: `Successfully joined #${channel.name}`,
    channel: {
      ...channel,
      isMember: true,
      memberCount: (channel.members || []).length
    }
  });
});

// GET /api/channels/:id - Get channel details and members
router.get('/channels/:id', (req, res) => {
  const channel = channels.findById(req.params.id);
  const currentUserId = req.user.id;

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.isPrivate && !channels.isMember(channel.id, currentUserId)) {
    return res.status(403).json({ error: 'Access denied: You are not a member of this private channel' });
  }

  // Enrich members list
  const memberUsers = (channel.members || []).map((uid) => {
    const u = users.findById(uid);
    return u ? sanitizeUser(u, currentUserId) : null;
  }).filter(Boolean);

  res.json({
    channel: {
      ...channel,
      isOwner: channel.ownerId === currentUserId,
      isMember: channels.isMember(channel.id, currentUserId),
      passcode: channel.ownerId === currentUserId ? channel.passcode : undefined,
      membersList: memberUsers
    }
  });
});

// GET /api/channels/:id/messages - Get channel messages (strictly checks membership!)
router.get('/channels/:id/messages', (req, res) => {
  const channelId = req.params.id;
  const currentUserId = req.user.id;

  const channel = channels.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.isPrivate && !channels.isMember(channelId, currentUserId)) {
    return res.status(403).json({ error: 'Access denied: You must join this channel with a passcode to view messages' });
  }

  const channelMsgs = messages
    .find((m) => m.channelId === channelId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(enrichMessage);

  res.json({ messages: channelMsgs });
});

// POST /api/channels/:id/leave - Leave a channel
router.post('/channels/:id/leave', (req, res) => {
  const channelId = req.params.id;
  const currentUserId = req.user.id;

  const channel = channels.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.ownerId === currentUserId) {
    return res.status(400).json({ error: 'Channel owner cannot leave. You can delete the channel instead.' });
  }

  channels.removeMember(channelId, currentUserId);
  res.json({ message: `Left channel #${channel.name}` });
});

// PUT /api/channels/:id/passcode - Regenerate channel passcode (owner only)
router.put('/channels/:id/passcode', (req, res) => {
  const channelId = req.params.id;
  const currentUserId = req.user.id;

  const channel = channels.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.ownerId !== currentUserId) {
    return res.status(403).json({ error: 'Only the channel owner can regenerate the passcode' });
  }

  const newPasscode = generateChannelPasscode();
  const passcodeHash = bcrypt.hashSync(newPasscode, 8);

  const updated = channels.update(channelId, {
    passcode: newPasscode,
    passcodeHash
  });

  res.json({
    message: 'Channel passcode regenerated successfully',
    passcode: newPasscode
  });
});

// DELETE /api/channels/:id - Delete channel (owner only)
router.delete('/channels/:id', (req, res) => {
  const channelId = req.params.id;
  const currentUserId = req.user.id;

  const channel = channels.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.ownerId !== currentUserId) {
    return res.status(403).json({ error: 'Only the channel owner can delete this channel' });
  }

  channels.delete(channelId);
  res.json({ message: 'Channel deleted successfully' });
});

// ==========================================
// 5. AI ASSISTANT (NOVA AI) APIS
// ==========================================

// POST /api/ai/chat - Ask Nova AI
router.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const reply = await getAgentReply(prompt.trim(), context);
    res.json({
      reply,
      agent: AI_AGENT_PROFILE,
      hasLiveGemini: !!process.env.GEMINI_API_KEY
    });
  } catch (err) {
    console.error('Nova AI chat error:', err);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// POST /api/ai/smart-reply - Generate 3 quick smart reply chips
router.post('/ai/smart-reply', async (req, res) => {
  try {
    const { messageContent } = req.body;
    const suggestions = await generateSmartReplies(messageContent);
    res.json({ suggestions });
  } catch (err) {
    console.error('Nova AI smart-reply error:', err);
    res.status(500).json({ error: 'Failed to generate smart replies' });
  }
});

// POST /api/ai/summarize - Summarize channel or conversation
router.post('/api/ai/summarize', async (req, res) => {
  try {
    const { channelId, targetUserId } = req.body;
    let msgs = [];

    if (channelId) {
      if (!channels.isMember(channelId, req.user.id)) {
        return res.status(403).json({ error: 'Access denied: not a member of this channel' });
      }
      msgs = messages
        .find((m) => m.channelId === channelId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(enrichMessage);
    } else if (targetUserId) {
      const currentUserId = req.user.id;
      msgs = messages
        .find(
          (m) =>
            (m.senderId === currentUserId && m.recipientId === targetUserId) ||
            (m.senderId === targetUserId && m.recipientId === currentUserId)
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(enrichMessage);
    }

    const summary = await summarizeChat(msgs);
    res.json({ summary });
  } catch (err) {
    console.error('Nova AI summarize error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Also support legacy endpoint `/ai/summarize` for backward compatibility
router.post('/ai/summarize', async (req, res) => {
  const { channelId, targetUserId } = req.body;
  let msgs = [];
  if (channelId) {
    msgs = messages.find((m) => m.channelId === channelId).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(enrichMessage);
  } else if (targetUserId) {
    const currentUserId = req.user.id;
    msgs = messages.find((m) => (m.senderId === currentUserId && m.recipientId === targetUserId) || (m.senderId === targetUserId && m.recipientId === currentUserId)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(enrichMessage);
  }
  const summary = await summarizeChat(msgs);
  res.json({ summary });
});

// ==========================================
// 6. UPLOAD & REACTIONS APIS
// ==========================================

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

router.post('/messages/:messageId/reactions', (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.id;

  if (!emoji) {
    return res.status(400).json({ error: 'Emoji is required' });
  }

  const msg = messages.findById(messageId);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const currentReactions = msg.reactions || {};
  const usersForEmoji = currentReactions[emoji] || [];

  if (usersForEmoji.includes(userId)) {
    currentReactions[emoji] = usersForEmoji.filter((id) => id !== userId);
    if (currentReactions[emoji].length === 0) {
      delete currentReactions[emoji];
    }
  } else {
    currentReactions[emoji] = [...usersForEmoji, userId];
  }

  const updated = messages.update(messageId, { reactions: currentReactions });
  res.json({ message: enrichMessage(updated) });
});

module.exports = {
  router,
  enrichMessage
};
