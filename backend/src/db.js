const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = {
  users: [],
  channels: [],
  conversations: [],
  messages: []
};

const AI_AGENT_USER = {
  id: 'usr_nova_ai',
  username: 'nova-ai',
  email: 'nova@chatsphere.ai',
  displayName: 'Nova AI ✨',
  passwordHash: 'ai_bot_protected',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NovaChatSphere&backgroundColor=6366f1',
  dob: '2024-01-01',
  mobileNumber: '+10000000000',
  gender: 'AI',
  bio: 'Autonomous intelligent assistant for ChatSphere. Tag @Nova or message me anytime!',
  location: 'ChatSphere Cloud',
  interests: ['Real-Time Tech', 'AI Collaboration', 'Instant Answers'],
  privacy: { showDob: false, showMobile: false, showLocation: true },
  profileCompleted: true,
  status: 'Online 24/7 • Ready to help',
  isAgent: true,
  createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
};

const AI_LOUNGE_CHANNEL = {
  id: 'chan_ai_lounge',
  name: 'ai-lounge',
  description: 'Public AI Playground. Chat directly with Nova AI in real-time!',
  isPrivate: false,
  passcode: null,
  passcodeHash: null,
  icon: '🤖',
  ownerId: 'usr_nova_ai',
  members: ['usr_nova_ai', 'usr_alice', 'usr_bob', 'usr_charlie'],
  createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
};

function ensureAiAgentAndDefaults() {
  if (!db.users) db.users = [];
  if (!db.channels) db.channels = [];
  if (!db.conversations) db.conversations = [];
  if (!db.messages) db.messages = [];

  // Ensure Nova AI exists
  const aiIdx = db.users.findIndex((u) => u.id === AI_AGENT_USER.id);
  if (aiIdx === -1) {
    db.users.push(AI_AGENT_USER);
  } else {
    db.users[aiIdx] = { ...AI_AGENT_USER, ...db.users[aiIdx] };
  }

  // Ensure AI Lounge exists
  const loungeIdx = db.channels.findIndex((c) => c.id === AI_LOUNGE_CHANNEL.id);
  if (loungeIdx === -1) {
    db.channels.unshift(AI_LOUNGE_CHANNEL);
  }

  // Ensure channels have ownerId and members array
  db.channels.forEach((c) => {
    if (!c.members) c.members = ['usr_alice', 'usr_bob', 'usr_charlie'];
    if (!c.ownerId) c.ownerId = c.createdBy || 'usr_alice';
    if (c.isPrivate && !c.passcode) {
      c.passcode = 'CS-7788';
      c.passcodeHash = bcrypt.hashSync('CS-7788', 8);
    }
  });

  // Ensure messages have status
  db.messages.forEach((m) => {
    if (!m.status) m.status = 'read';
    if (!m.readBy) m.readBy = [m.senderId];
  });

  saveDatabase();
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      ensureAiAgentAndDefaults();
    } else {
      seedDatabase();
    }
  } catch (err) {
    console.error('Error loading db.json, re-initializing:', err);
    seedDatabase();
  }
}

function saveDatabase() {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing to db.json:', err);
  }
}

function seedDatabase() {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  const demoUsers = [
    AI_AGENT_USER,
    {
      id: 'usr_alice',
      username: 'alice',
      email: 'alice@chatsphere.io',
      displayName: 'Alice Johnson',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      dob: '1996-05-14',
      mobileNumber: '+14155552671',
      gender: 'Female',
      bio: 'Full-stack builder passionate about real-time web applications & ChatSphere 🚀',
      location: 'San Francisco, CA',
      interests: ['React', 'WebSockets', 'UI/UX Design', 'AI'],
      privacy: { showDob: false, showMobile: false, showLocation: true },
      profileCompleted: true,
      status: 'Building cool stuff on ChatSphere 🚀',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'usr_bob',
      username: 'bob',
      email: 'bob@chatsphere.io',
      displayName: 'Bob Smith',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      dob: '1994-08-22',
      mobileNumber: '+14155559843',
      gender: 'Male',
      bio: 'Product designer & coffee enthusiast ☕ Lover of sleek interfaces and minimalism.',
      location: 'Austin, TX',
      interests: ['Design Systems', 'Coffee', 'Tailwind CSS'],
      privacy: { showDob: false, showMobile: false, showLocation: true },
      profileCompleted: true,
      status: 'Designing next-gen experiences ☕',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'usr_charlie',
      username: 'charlie',
      email: 'charlie@chatsphere.io',
      displayName: 'Charlie Davis',
      passwordHash: defaultPasswordHash,
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      dob: '1998-11-03',
      mobileNumber: '+14155554321',
      gender: 'Non-binary',
      bio: 'Cloud engineer and open-source contributor. Always ready to connect!',
      location: 'Seattle, WA',
      interests: ['Distributed Systems', 'DevOps', 'Node.js'],
      privacy: { showDob: false, showMobile: false, showLocation: false },
      profileCompleted: true,
      status: 'Ready to connect & code!',
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
    }
  ];

  const demoChannels = [
    AI_LOUNGE_CHANNEL,
    {
      id: 'chan_general',
      name: 'general',
      description: 'Default community channel for team updates and casual chatter',
      isPrivate: false,
      passcode: null,
      passcodeHash: null,
      icon: '💬',
      ownerId: 'usr_alice',
      members: ['usr_alice', 'usr_bob', 'usr_charlie', 'usr_nova_ai'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'chan_tech',
      name: 'tech-talk',
      description: 'Discussions on React, Node.js, WebSockets, and code tips',
      isPrivate: false,
      passcode: null,
      passcodeHash: null,
      icon: '⚡',
      ownerId: 'usr_bob',
      members: ['usr_alice', 'usr_bob', 'usr_charlie'],
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'chan_vip',
      name: 'vip-squad',
      description: 'Private channel protected with a secure passcode',
      isPrivate: true,
      passcode: 'CS-8899',
      passcodeHash: bcrypt.hashSync('CS-8899', 8),
      icon: '🔒',
      ownerId: 'usr_alice',
      members: ['usr_alice', 'usr_bob'],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ];

  const now = Date.now();
  const demoMessages = [
    {
      id: 'msg_ai_welcome',
      channelId: 'chan_ai_lounge',
      senderId: 'usr_nova_ai',
      recipientId: null,
      content: '👋 Welcome to **ChatSphere**! I am **Nova AI**.\n\nYou can chat with me in real-time, ask questions, draft messages, or type `@Nova` in any channel!',
      reactions: { '✨': ['usr_alice'], '🤖': ['usr_bob'] },
      status: 'read',
      readBy: ['usr_alice', 'usr_bob', 'usr_charlie'],
      createdAt: new Date(now - 3600000 * 12).toISOString()
    },
    {
      id: 'msg_1',
      channelId: 'chan_general',
      senderId: 'usr_alice',
      recipientId: null,
      content: 'Welcome to ChatSphere! Real-time messaging, channels with passcodes, and Nova AI are all active.',
      reactions: { '👋': ['usr_bob', 'usr_charlie'], '🔥': ['usr_bob'] },
      status: 'read',
      readBy: ['usr_alice', 'usr_bob', 'usr_charlie'],
      createdAt: new Date(now - 3600000 * 4).toISOString()
    },
    {
      id: 'msg_2',
      channelId: 'chan_general',
      senderId: 'usr_bob',
      recipientId: null,
      content: 'Loving the real-time sync! Typing indicators, delivery receipts, and sleek themes look fantastic.',
      reactions: { '💯': ['usr_alice'] },
      status: 'read',
      readBy: ['usr_alice', 'usr_bob'],
      createdAt: new Date(now - 3600000 * 2).toISOString()
    },
    {
      id: 'msg_3',
      channelId: 'chan_tech',
      senderId: 'usr_charlie',
      recipientId: null,
      content: 'Architecture tip: ChatSphere uses Socket.IO rooms for O(1) broadcast delivery with instant fallback.',
      reactions: { '🚀': ['usr_alice', 'usr_bob'] },
      status: 'read',
      readBy: ['usr_charlie', 'usr_alice'],
      createdAt: new Date(now - 3600000 * 1).toISOString()
    }
  ];

  db = {
    users: demoUsers,
    channels: demoChannels,
    conversations: [],
    messages: demoMessages
  };

  saveDatabase();
}

// Initial load
loadDatabase();

// Clean public user projection (never leaks passwordHash, mobile, DOB without privacy permission)
function sanitizeUser(user, viewerId = null) {
  if (!user) return null;
  const isOwner = viewerId && viewerId === user.id;
  const privacy = user.privacy || { showDob: false, showMobile: false, showLocation: true };

  return {
    id: user.id,
    firebaseUid: user.firebaseUid || null,
    username: user.username,
    email: isOwner || privacy.showEmail ? user.email : undefined,
    displayName: user.displayName,
    avatar: user.avatar,
    status: user.status,
    bio: user.bio || '',
    location: isOwner || privacy.showLocation ? (user.location || '') : '',
    interests: user.interests || [],
    gender: isOwner ? user.gender : undefined,
    dob: isOwner || privacy.showDob ? user.dob : undefined,
    mobileNumber: isOwner || privacy.showMobile ? user.mobileNumber : undefined,
    profileCompleted: !!user.profileCompleted,
    isAgent: !!user.isAgent,
    privacy,
    createdAt: user.createdAt
  };
}

module.exports = {
  db,
  saveDatabase,
  sanitizeUser,
  users: {
    find: (predicate) => (predicate ? db.users.filter(predicate) : db.users),
    findOne: (predicate) => db.users.find(predicate),
    findById: (id) => db.users.find((u) => u.id === id),
    findByEmail: (email) => db.users.find((u) => u.email?.toLowerCase() === email?.toLowerCase()),
    findByUsername: (username) => db.users.find((u) => u.username?.toLowerCase() === username?.toLowerCase()),
    findByFirebaseUid: (uid) => db.users.find((u) => u.firebaseUid === uid),
    create: (user) => {
      db.users.push(user);
      saveDatabase();
      return user;
    },
    update: (id, updates) => {
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        db.users[idx] = { ...db.users[idx], ...updates };
        saveDatabase();
        return db.users[idx];
      }
      return null;
    },
    search: (query, currentUserId) => {
      const clean = (query || '').trim().toLowerCase();
      return db.users
        .filter((u) => {
          if (u.id === currentUserId) return false;
          if (!clean) return true;
          return (
            u.displayName?.toLowerCase().includes(clean) ||
            u.username?.toLowerCase().includes(clean)
          );
        })
        .map((u) => sanitizeUser(u, currentUserId));
    }
  },
  channels: {
    find: (predicate) => (predicate ? db.channels.filter(predicate) : db.channels),
    findById: (id) => db.channels.find((c) => c.id === id),
    findOne: (predicate) => db.channels.find(predicate),
    create: (channel) => {
      db.channels.push(channel);
      saveDatabase();
      return channel;
    },
    update: (id, updates) => {
      const idx = db.channels.findIndex((c) => c.id === id);
      if (idx !== -1) {
        db.channels[idx] = { ...db.channels[idx], ...updates };
        saveDatabase();
        return db.channels[idx];
      }
      return null;
    },
    delete: (id) => {
      const idx = db.channels.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const deleted = db.channels.splice(idx, 1)[0];
        // Also remove associated messages
        db.messages = db.messages.filter((m) => m.channelId !== id);
        saveDatabase();
        return deleted;
      }
      return null;
    },
    isMember: (channelId, userId) => {
      const c = db.channels.find((ch) => ch.id === channelId);
      if (!c) return false;
      if (!c.isPrivate) return true; // public channels accessible to registered users
      return Array.isArray(c.members) && c.members.includes(userId);
    },
    addMember: (channelId, userId) => {
      const c = db.channels.find((ch) => ch.id === channelId);
      if (c) {
        if (!c.members) c.members = [];
        if (!c.members.includes(userId)) {
          c.members.push(userId);
          saveDatabase();
        }
        return c;
      }
      return null;
    },
    removeMember: (channelId, userId) => {
      const c = db.channels.find((ch) => ch.id === channelId);
      if (c && c.members) {
        c.members = c.members.filter((id) => id !== userId);
        saveDatabase();
        return c;
      }
      return null;
    }
  },
  conversations: {
    find: (predicate) => (predicate ? db.conversations.filter(predicate) : db.conversations),
    findById: (id) => db.conversations.find((c) => c.id === id),
    findForUser: (userId) => db.conversations.filter((c) => c.participants.includes(userId)),
    findOrCreate: (userId1, userId2) => {
      let conv = db.conversations.find(
        (c) => c.participants.includes(userId1) && c.participants.includes(userId2)
      );
      if (!conv) {
        conv = {
          id: `conv_${[userId1, userId2].sort().join('_')}`,
          participants: [userId1, userId2],
          lastMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.conversations.push(conv);
        saveDatabase();
      }
      return conv;
    },
    update: (id, updates) => {
      const idx = db.conversations.findIndex((c) => c.id === id);
      if (idx !== -1) {
        db.conversations[idx] = { ...db.conversations[idx], ...updates, updatedAt: new Date().toISOString() };
        saveDatabase();
        return db.conversations[idx];
      }
      return null;
    }
  },
  messages: {
    find: (predicate) => (predicate ? db.messages.filter(predicate) : db.messages),
    findById: (id) => db.messages.find((m) => m.id === id),
    create: (message) => {
      if (!message.status) message.status = 'sent';
      if (!message.readBy) message.readBy = [message.senderId];
      db.messages.push(message);
      saveDatabase();
      return message;
    },
    update: (id, updates) => {
      const idx = db.messages.findIndex((m) => m.id === id);
      if (idx !== -1) {
        db.messages[idx] = { ...db.messages[idx], ...updates };
        saveDatabase();
        return db.messages[idx];
      }
      return null;
    },
    delete: (id) => {
      const idx = db.messages.findIndex((m) => m.id === id);
      if (idx !== -1) {
        const deleted = db.messages.splice(idx, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    }
  }
};
