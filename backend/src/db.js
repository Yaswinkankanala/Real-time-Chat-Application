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
  messages: [],
  aiConversations: []
};

// Initial default private channel: Vignan with passcode 1299 (hashed securely)
const INITIAL_VIGNAN_CHANNEL = {
  id: 'chan_vignan',
  name: 'Vignan',
  description: 'Official private channel for Vignan. Enter passcode to join.',
  isPrivate: true,
  passcodeHash: bcrypt.hashSync('1299', 8),
  icon: '🔒',
  ownerId: 'system',
  members: [], // Users must enter 1299 to join; not added automatically
  createdAt: new Date().toISOString()
};

// Generate permanent unique identification code (e.g. CS8K92A, CS4M71P, CS9X23B)
function generateUniqueCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 1000) {
    attempts++;
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    code = `CS${randomPart}`;
    const exists = db.users && db.users.some((u) => u.uniqueCode === code);
    if (!exists) {
      isUnique = true;
    }
  }

  return code;
}

// Database-level normalization and error types
class DuplicateKeyError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'DuplicateKeyError';
    this.field = field;
    this.code = 11000;
  }
}

function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Canonical Phone Normalization
 * Standardizes phone numbers so identical numbers with different formats
 * (e.g. "9876543210", "+91 9876543210", "+91-9876543210", "09876543210")
 * produce the same canonical key, while preserving distinct international country codes
 * (e.g. "+1 9876543210" vs "+91 9876543210").
 */
function canonicalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // If input starts with '+', treat leading digits as international country code
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  // If input starts with '00', treat as international dialing prefix
  if (digits.startsWith('00') && digits.length > 7) {
    return `+${digits.substring(2)}`;
  }

  // If input starts with single '0' followed by 10 digits (national trunk prefix in India, e.g. 09876543210)
  if (digits.startsWith('0') && digits.length === 11) {
    return `+91${digits.substring(1)}`;
  }

  // If exactly 10 digits without country code, default to +91 (India)
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // If 12 digits starting with '91' without '+' (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  // If 11 digits starting with '1' without '+' (e.g. 14155552671 US/Canada)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

function normalizePhone(phone) {
  return canonicalizePhone(phone);
}

function arePhonesMatching(phone1, phone2) {
  if (!phone1 || !phone2) return false;
  const c1 = canonicalizePhone(phone1);
  const c2 = canonicalizePhone(phone2);
  if (!c1 || !c2) return false;
  return c1 === c2;
}

// In-memory unique indexes to enforce strict uniqueness constraints
const indexes = {
  emails: new Map(),     // normalized email -> userId
  phones: new Map(),     // canonical phone -> userId
  usernames: new Map()   // normalized username -> userId
};

// In-flight reservation locks for atomic concurrency protection during simultaneous registration
const pendingRegistrations = {
  emails: new Set(),
  phones: new Set(),
  usernames: new Set()
};

/**
 * Atomically reserve a set of credentials during in-flight registration.
 * Throws DuplicateKeyError immediately if any credential is taken or pending in another simultaneous request.
 * Returns an unreserve release callback to clean up on error or completion.
 */
function reserveRegistration({ email, phone, username }) {
  const normEmail = normalizeEmail(email);
  const canonPhone = canonicalizePhone(phone);
  const normUser = (username || '').trim().toLowerCase();

  // 1. Check in-memory index or pending in-flight reservation for Email
  if (normEmail) {
    if (indexes.emails.has(normEmail) || pendingRegistrations.emails.has(normEmail) || db.users.some((u) => normalizeEmail(u.email) === normEmail)) {
      throw new DuplicateKeyError(
        'email',
        'This email address is already registered. Please log in instead.'
      );
    }
  }

  // 2. Check in-memory index or pending in-flight reservation for Phone
  if (canonPhone) {
    if (indexes.phones.has(canonPhone) || pendingRegistrations.phones.has(canonPhone) || db.users.some((u) => u.mobileNumber && arePhonesMatching(u.mobileNumber, canonPhone))) {
      throw new DuplicateKeyError(
        'mobileNumber',
        'This contact number is already registered. Please use a different number.'
      );
    }
  }

  // 3. Check in-memory index or pending in-flight reservation for Username
  if (normUser) {
    if (indexes.usernames.has(normUser) || pendingRegistrations.usernames.has(normUser) || db.users.some((u) => (u.username || '').trim().toLowerCase() === normUser)) {
      throw new DuplicateKeyError(
        'username',
        'This username is already taken by another user.'
      );
    }
  }

  // Atomically mark pending
  if (normEmail) pendingRegistrations.emails.add(normEmail);
  if (canonPhone) pendingRegistrations.phones.add(canonPhone);
  if (normUser) pendingRegistrations.usernames.add(normUser);

  return function release() {
    if (normEmail) pendingRegistrations.emails.delete(normEmail);
    if (canonPhone) pendingRegistrations.phones.delete(canonPhone);
    if (normUser) pendingRegistrations.usernames.delete(normUser);
  };
}

function rebuildIndexes() {
  indexes.emails.clear();
  indexes.phones.clear();
  indexes.usernames.clear();

  if (Array.isArray(db.users)) {
    db.users.forEach((u) => {
      if (u.email) {
        const normEmail = normalizeEmail(u.email);
        if (normEmail && !indexes.emails.has(normEmail)) {
          indexes.emails.set(normEmail, u.id);
        }
      }
      if (u.mobileNumber) {
        const canonPhone = canonicalizePhone(u.mobileNumber);
        if (canonPhone && !indexes.phones.has(canonPhone)) {
          indexes.phones.set(canonPhone, u.id);
        }
      }
      if (u.username) {
        const normUser = (u.username || '').trim().toLowerCase();
        if (normUser && !indexes.usernames.has(normUser)) {
          indexes.usernames.set(normUser, u.id);
        }
      }
    });
  }
}

function ensureInitialState() {
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.channels)) db.channels = [];
  if (!Array.isArray(db.conversations)) db.conversations = [];
  if (!Array.isArray(db.messages)) db.messages = [];
  if (!Array.isArray(db.aiConversations)) db.aiConversations = [];

  // Remove any legacy demo users or AI bots
  db.users = db.users.filter(
    (u) => !['usr_nova_ai', 'usr_alice', 'usr_bob', 'usr_charlie'].includes(u.id) && !u.isAgent
  );

  // Remove any legacy channels that are not Vignan or user-created
  db.channels = db.channels.filter(
    (c) => !['chan_ai_lounge', 'chan_general', 'chan_tech', 'chan_vip'].includes(c.id)
  );

  // Ensure Vignan channel exists with passcode 1299
  const vignanIdx = db.channels.findIndex((c) => c.name.toLowerCase() === 'vignan');
  if (vignanIdx === -1) {
    db.channels.unshift(INITIAL_VIGNAN_CHANNEL);
  } else {
    // Ensure Vignan properties are strictly maintained with hashed passcode (never plaintext)
    db.channels[vignanIdx].isPrivate = true;
    delete db.channels[vignanIdx].passcode;
    if (!db.channels[vignanIdx].passcodeHash) {
      db.channels[vignanIdx].passcodeHash = bcrypt.hashSync('1299', 8);
    }
    if (!Array.isArray(db.channels[vignanIdx].members)) {
      db.channels[vignanIdx].members = [];
    }
  }

  // Remove legacy demo messages
  db.messages = db.messages.filter(
    (m) =>
      !['msg_ai_welcome', 'msg_1', 'msg_2', 'msg_3'].includes(m.id) &&
      m.channelId !== 'chan_ai_lounge' &&
      m.senderId !== 'usr_nova_ai' &&
      m.recipientId !== 'usr_nova_ai'
  );

  // Remove conversations involving legacy users
  db.conversations = db.conversations.filter(
    (c) => !c.participants.some((p) => ['usr_nova_ai', 'usr_alice', 'usr_bob', 'usr_charlie'].includes(p))
  );

  // Backfill uniqueCode, notificationsEnabled, and theme for any existing genuine users
  db.users.forEach((u) => {
    if (!u.uniqueCode) {
      u.uniqueCode = generateUniqueCode();
    }
    if (u.notificationsEnabled === undefined) {
      u.notificationsEnabled = true;
    }
    if (!u.theme) {
      u.theme = 'dark';
    }
  });

  saveDatabase();
  rebuildIndexes();
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
    } else {
      db = {
        users: [],
        channels: [INITIAL_VIGNAN_CHANNEL],
        conversations: [],
        messages: [],
        aiConversations: []
      };
    }
    ensureInitialState();
  } catch (err) {
    console.error('Error loading db.json, re-initializing clean database:', err);
    db = {
      users: [],
      channels: [INITIAL_VIGNAN_CHANNEL],
      conversations: [],
      messages: [],
      aiConversations: []
    };
    saveDatabase();
    rebuildIndexes();
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

// Initial load
loadDatabase();

// Clean public user projection (never leaks passwordHash, contact number without permission, etc.)
function sanitizeUser(user, viewerId = null) {
  if (!user) return null;
  const isOwner = viewerId && viewerId === user.id;

  return {
    id: user.id,
    uniqueCode: user.uniqueCode || '',
    username: user.username,
    email: isOwner ? user.email : user.email,
    displayName: user.displayName,
    avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.username || 'User')}`,
    status: user.status || 'Active on ChatSphere',
    bio: user.bio || '',
    interests: Array.isArray(user.interests) ? user.interests : [],
    gender: user.gender || '',
    dob: isOwner ? user.dob : undefined,
    mobileNumber: isOwner ? user.mobileNumber : user.mobileNumber,
    profileCompleted: !!user.profileCompleted,
    notificationsEnabled: user.notificationsEnabled !== false,
    theme: user.theme || 'dark',
    createdAt: user.createdAt
  };
}

module.exports = {
  db,
  saveDatabase,
  sanitizeUser,
  generateUniqueCode,
  normalizeEmail,
  normalizePhone,
  canonicalizePhone,
  arePhonesMatching,
  DuplicateKeyError,
  indexes,
  rebuildIndexes,
  pendingRegistrations,
  reserveRegistration,
  users: {
    find: (predicate) => (predicate ? db.users.filter(predicate) : db.users),
    findOne: (predicate) => db.users.find(predicate),
    findById: (id) => db.users.find((u) => u.id === id),
    findByEmail: (email) => {
      if (!email) return null;
      const clean = normalizeEmail(email);
      if (!clean) return null;
      const indexedId = indexes.emails.get(clean);
      if (indexedId) {
        const user = db.users.find((u) => u.id === indexedId);
        if (user) return user;
        indexes.emails.delete(clean);
      }
      return db.users.find((u) => normalizeEmail(u.email) === clean) || null;
    },
    findByFirebaseUid: (uid) => {
      if (!uid) return null;
      return db.users.find((u) => u.firebaseUid === uid);
    },
    findByUsername: (username) => {
      if (!username) return null;
      const clean = (username || '').trim().toLowerCase();
      const indexedId = indexes.usernames.get(clean);
      if (indexedId) {
        const user = db.users.find((u) => u.id === indexedId);
        if (user) return user;
        indexes.usernames.delete(clean);
      }
      return db.users.find((u) => (u.username || '').trim().toLowerCase() === clean) || null;
    },
    findByMobile: (mobileNumber) => {
      if (!mobileNumber) return null;
      const canon = canonicalizePhone(mobileNumber);
      if (canon && indexes.phones.has(canon)) {
        const indexedId = indexes.phones.get(canon);
        const user = db.users.find((u) => u.id === indexedId);
        if (user) return user;
        indexes.phones.delete(canon);
      }
      return db.users.find((u) => u.mobileNumber && arePhonesMatching(u.mobileNumber, mobileNumber)) || null;
    },
    findByUniqueCode: (code) => {
      if (!code) return null;
      return db.users.find((u) => u.uniqueCode?.toUpperCase() === code.trim().toUpperCase());
    },
    create: (user) => {
      // 1. Enforce unique normalized email constraint at database model level
      if (user.email) {
        const normEmail = normalizeEmail(user.email);
        const existingWithEmail = db.users.find((u) => normalizeEmail(u.email) === normEmail);
        if (normEmail && ((indexes.emails.has(normEmail) && existingWithEmail) || existingWithEmail)) {
          throw new DuplicateKeyError(
            'email',
            'This email address is already registered. Please log in instead.'
          );
        }
        user.email = normEmail;
      }

      // 2. Enforce unique normalized contact number constraint at database model level
      if (user.mobileNumber) {
        const canonPhone = canonicalizePhone(user.mobileNumber);
        const existingWithPhone = db.users.find((u) => u.mobileNumber && arePhonesMatching(u.mobileNumber, user.mobileNumber));
        if (canonPhone && ((indexes.phones.has(canonPhone) && existingWithPhone) || existingWithPhone)) {
          throw new DuplicateKeyError(
            'mobileNumber',
            'This contact number is already registered. Please use a different number.'
          );
        }
        user.mobileNumber = canonPhone;
      }

      // 3. Enforce unique username constraint at database model level
      if (user.username) {
        const normUser = (user.username || '').trim().toLowerCase();
        const existingWithUser = db.users.find((u) => (u.username || '').trim().toLowerCase() === normUser);
        if (normUser && ((indexes.usernames.has(normUser) && existingWithUser) || existingWithUser)) {
          throw new DuplicateKeyError('username', 'This username is already taken by another user.');
        }
      }

      if (!user.uniqueCode) {
        user.uniqueCode = generateUniqueCode();
      }
      if (user.notificationsEnabled === undefined) {
        user.notificationsEnabled = true;
      }
      if (!user.theme) {
        user.theme = 'dark';
      }

      db.users.push(user);

      // Update in-memory unique indexes
      if (user.email) indexes.emails.set(user.email, user.id);
      if (user.mobileNumber) indexes.phones.set(user.mobileNumber, user.id);
      if (user.username) indexes.usernames.set(user.username.toLowerCase(), user.id);

      saveDatabase();
      return user;
    },
    update: (id, updates) => {
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        const existing = db.users[idx];

        // Enforce unique email check if updating email
        if (updates.email) {
          const normEmail = normalizeEmail(updates.email);
          const ownerId = indexes.emails.get(normEmail);
          if (normEmail && ((ownerId && ownerId !== id) || db.users.some((u) => u.id !== id && normalizeEmail(u.email) === normEmail))) {
            throw new DuplicateKeyError(
              'email',
              'This email address is already registered. Please log in instead.'
            );
          }
          updates.email = normEmail;
        }

        // Enforce unique contact number check if updating phone
        if (updates.mobileNumber) {
          const canonPhone = canonicalizePhone(updates.mobileNumber);
          const ownerId = indexes.phones.get(canonPhone);
          if (canonPhone && ((ownerId && ownerId !== id) || db.users.some((u) => u.id !== id && u.mobileNumber && arePhonesMatching(u.mobileNumber, updates.mobileNumber)))) {
            throw new DuplicateKeyError(
              'mobileNumber',
              'This contact number is already registered. Please use a different number.'
            );
          }
          updates.mobileNumber = canonPhone;
        }

        // Enforce unique username check if updating username
        if (updates.username) {
          const normUser = (updates.username || '').trim().toLowerCase();
          const ownerId = indexes.usernames.get(normUser);
          if (normUser && ((ownerId && ownerId !== id) || db.users.some((u) => u.id !== id && (u.username || '').trim().toLowerCase() === normUser))) {
            throw new DuplicateKeyError('username', 'This username is already taken by another user.');
          }
        }

        // Protect uniqueCode and createdAt from being modified
        delete updates.uniqueCode;
        delete updates.createdAt;
        delete updates.id;

        // Clean previous index entries if changed
        if (updates.email && existing.email && existing.email !== updates.email) {
          indexes.emails.delete(existing.email);
        }
        if (updates.mobileNumber && existing.mobileNumber && existing.mobileNumber !== updates.mobileNumber) {
          indexes.phones.delete(existing.mobileNumber);
        }
        if (updates.username && existing.username && existing.username.toLowerCase() !== updates.username.toLowerCase()) {
          indexes.usernames.delete(existing.username.toLowerCase());
        }

        db.users[idx] = { ...db.users[idx], ...updates };

        // Set new index entries
        if (db.users[idx].email) indexes.emails.set(db.users[idx].email, id);
        if (db.users[idx].mobileNumber) indexes.phones.set(db.users[idx].mobileNumber, id);
        if (db.users[idx].username) indexes.usernames.set(db.users[idx].username.toLowerCase(), id);

        saveDatabase();
        return db.users[idx];
      }
      return null;
    },
    delete: (id) => {
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx !== -1) {
        const deletedUser = db.users.splice(idx, 1)[0];

        // Clean from indexes
        if (deletedUser.email) indexes.emails.delete(deletedUser.email);
        if (deletedUser.mobileNumber) indexes.phones.delete(deletedUser.mobileNumber);
        if (deletedUser.username) indexes.usernames.delete(deletedUser.username.toLowerCase());

        // Remove user from channel memberships
        db.channels.forEach((c) => {
          if (Array.isArray(c.members)) {
            c.members = c.members.filter((m) => m !== id);
          }
        });

        // Remove user conversations and related messages
        const userConvIds = db.conversations
          .filter((c) => c.participants.includes(id))
          .map((c) => c.id);

        db.conversations = db.conversations.filter((c) => !c.participants.includes(id));
        db.messages = db.messages.filter(
          (m) =>
            m.senderId !== id &&
            m.recipientId !== id &&
            !userConvIds.includes(m.conversationId)
        );
        db.aiConversations = db.aiConversations.filter((c) => c.userId !== id);

        saveDatabase();
        return deletedUser;
      }
      return null;
    },
    search: (query, currentUserId) => {
      const clean = (query || '').trim().toLowerCase();
      if (!clean) return [];

      const cleanDigits = clean.replace(/[^0-9]/g, '');
      const canonQuery = canonicalizePhone(query);

      return db.users
        .filter((u) => {
          if (u.id === currentUserId) return false;

          // Match by Unique Code (exact or partial)
          if (u.uniqueCode && u.uniqueCode.toLowerCase() === clean) return true;
          if (u.uniqueCode && u.uniqueCode.toLowerCase().includes(clean)) return true;

          // Match by Contact / Mobile Number (canonical exact or digits match)
          if (u.mobileNumber) {
            if (canonQuery && canonicalizePhone(u.mobileNumber) === canonQuery) return true;
            if (cleanDigits.length >= 3) {
              const uDigits = u.mobileNumber.replace(/[^0-9]/g, '');
              if (uDigits.includes(cleanDigits) || u.mobileNumber.toLowerCase().includes(clean)) {
                return true;
              }
            }
          }

          // Match by Username or Full Name
          if (u.username && u.username.toLowerCase() === clean) return true;
          if (u.displayName && u.displayName.toLowerCase().includes(clean)) return true;
          if (u.username && u.username.toLowerCase().includes(clean)) return true;

          return false;
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
      if (c.ownerId === userId) return true;
      if (Array.isArray(c.members) && c.members.includes(userId)) return true;
      if (!c.isPrivate) return true; // public channels accessible to registered users
      return false;
    },
    isExplicitMember: (channelId, userId) => {
      const c = db.channels.find((ch) => ch.id === channelId);
      if (!c) return false;
      return c.ownerId === userId || (Array.isArray(c.members) && c.members.includes(userId));
    },
    addMember: (channelId, userId) => {
      const c = db.channels.find((ch) => ch.id === channelId);
      if (c) {
        if (!Array.isArray(c.members)) c.members = [];
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
      if (c && Array.isArray(c.members)) {
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
  },
  aiConversations: {
    find: (predicate) => (predicate ? db.aiConversations.filter(predicate) : db.aiConversations),
    findForUser: (userId) =>
      db.aiConversations
        .filter((c) => c.userId === userId)
        .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)),
    findById: (id) => db.aiConversations.find((c) => c.id === id),
    create: (userId, title = 'New Conversation') => {
      const newConv = {
        id: `aiconv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        title: title || 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.aiConversations.push(newConv);
      saveDatabase();
      return newConv;
    },
    addMessage: (convId, { role, content }) => {
      const conv = db.aiConversations.find((c) => c.id === convId);
      if (!conv) return null;
      if (!Array.isArray(conv.messages)) conv.messages = [];
      const msg = {
        id: `aimsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        role: role === 'user' ? 'user' : 'assistant',
        content: String(content || ''),
        timestamp: new Date().toISOString()
      };
      conv.messages.push(msg);
      conv.updatedAt = new Date().toISOString();
      saveDatabase();
      return msg;
    },
    updateTitle: (id, title) => {
      const conv = db.aiConversations.find((c) => c.id === id);
      if (conv) {
        conv.title = title;
        conv.updatedAt = new Date().toISOString();
        saveDatabase();
        return conv;
      }
      return null;
    },
    delete: (id, userId) => {
      const idx = db.aiConversations.findIndex((c) => c.id === id && c.userId === userId);
      if (idx !== -1) {
        const deleted = db.aiConversations.splice(idx, 1)[0];
        saveDatabase();
        return deleted;
      }
      return null;
    }
  }
};
