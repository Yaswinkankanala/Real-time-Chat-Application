const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

/**
 * Creates an immutable timestamped backup of db.json
 */
function createBackup() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `db.backup.${timestamp}.json`);
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, backupFile);
  }
  return backupFile;
}

/**
 * Inspect all existing records across all database collections
 */
function inspectCurrentRecords() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], channels: [], conversations: [], messages: [], aiConversations: [] };
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: [], channels: [], conversations: [], messages: [], aiConversations: [] };
  }
}

/**
 * Safely executes fresh database reset.
 * 1. Creates full snapshot backup.
 * 2. Clears previous users, conversations, messages, and AI conversations.
 * 3. Resets channels to clean initial state with passcode-protected Vignan private channel (1299).
 * 4. Preserves database schema and index rebuilding.
 */
function executeReset() {
  const backupFile = createBackup();
  const current = inspectCurrentRecords();

  const INITIAL_VIGNAN_CHANNEL = {
    id: 'chan_vignan',
    name: 'Vignan',
    description: 'Official private channel for Vignan. Enter passcode to join.',
    isPrivate: true,
    passcodeHash: bcrypt.hashSync('1299', 8),
    icon: '🔒',
    ownerId: 'system',
    members: [],
    createdAt: new Date().toISOString()
  };

  const freshDb = {
    users: [],
    channels: [INITIAL_VIGNAN_CHANNEL],
    conversations: [],
    messages: [],
    aiConversations: []
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(freshDb, null, 2), 'utf-8');

  try {
    const dbModule = require('./db');
    if (dbModule && dbModule.rebuildIndexes) {
      dbModule.db.users = freshDb.users;
      dbModule.db.channels = freshDb.channels;
      dbModule.db.conversations = freshDb.conversations;
      dbModule.db.messages = freshDb.messages;
      dbModule.db.aiConversations = freshDb.aiConversations;
      dbModule.rebuildIndexes();
    }
  } catch (e) {}

  return {
    success: true,
    backupFile,
    recordsInspected: {
      users: current.users || [],
      channels: current.channels || [],
      conversations: current.conversations || [],
      messages: current.messages || [],
      aiConversations: current.aiConversations || []
    },
    deletedCounts: {
      usersCount: current.users?.length || 0,
      channelsReset: current.channels?.length || 0,
      conversationsCount: current.conversations?.length || 0,
      messagesCount: current.messages?.length || 0,
      aiConversationsCount: current.aiConversations?.length || 0
    }
  };
}

module.exports = {
  createBackup,
  inspectCurrentRecords,
  executeReset
};

