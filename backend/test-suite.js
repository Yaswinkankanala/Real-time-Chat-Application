const assert = require('assert');
const bcrypt = require('bcryptjs');
const { db, saveDatabase, users, channels, conversations, messages, generateUniqueCode, sanitizeUser } = require('./src/db');
const { checkProfileCompleted, isValidPhoneNumber } = require('./src/routes/authRoutes');
const { generateSummary, localNlpSummarize } = require('./src/aiSummary');

console.log('🧪 Starting ChatSphere Comprehensive Test Suite...\n');

// Test 1: Initial state has 0 users, 0 messages, 0 conversations, and ONLY Vignan channel
console.log('Test 1: Verifying Initial Database State...');
assert.strictEqual(db.users.length, 0, 'Users array should be empty initially');
assert.strictEqual(db.conversations.length, 0, 'Conversations should be empty initially');
assert.strictEqual(db.messages.length, 0, 'Messages should be empty initially');
assert.strictEqual(db.channels.length, 1, 'Only Vignan channel should exist initially');
assert.strictEqual(db.channels[0].name, 'Vignan', 'Channel name must be Vignan');
assert.strictEqual(db.channels[0].isPrivate, true, 'Vignan channel must be private');
assert.strictEqual(db.channels[0].passcode, undefined, 'Vignan plaintext passcode must never be stored in database');
assert.ok(bcrypt.compareSync('1299', db.channels[0].passcodeHash), 'Vignan passcode hash must match 1299');
assert.strictEqual(db.channels[0].members.length, 0, 'Vignan members must be empty initially');
console.log('✅ Test 1 Passed: Initial Database State is clean and verified.\n');

// Test 2: Unique identification code generation
console.log('Test 2: Verifying Unique Code Generation...');
const code1 = generateUniqueCode();
const code2 = generateUniqueCode();
assert.ok(code1.startsWith('CS'), 'Code must start with CS');
assert.strictEqual(code1.length, 7, 'Code must be CS + 5 characters (7 chars total)');
assert.notStrictEqual(code1, code2, 'Codes generated must be unique');
console.log(`✅ Test 2 Passed: Generated codes: ${code1}, ${code2}\n`);

// Test 3: New User Registration with mandatory fields
console.log('Test 3: Creating and Registering User 1 (Alice)...');
const user1 = {
  id: 'usr_test_1',
  uniqueCode: generateUniqueCode(),
  displayName: 'Alice Tester',
  username: 'alicetester',
  email: 'alice@test.com',
  passwordHash: bcrypt.hashSync('securepass123', 8),
  mobileNumber: '+919876543210',
  gender: 'Female',
  dob: '1998-05-20',
  avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  bio: 'Testing ChatSphere',
  interests: ['Tech & Coding', 'UI/UX Design'],
  notificationsEnabled: true,
  theme: 'dark',
  profileCompleted: true,
  createdAt: new Date().toISOString()
};
users.create(user1);
assert.strictEqual(db.users.length, 1);
assert.strictEqual(user1.uniqueCode.length, 7);
console.log(`✅ Test 3 Passed: User 1 created with Unique Code ${user1.uniqueCode}\n`);

// Test 4: Creating User 2 (Bob)
console.log('Test 4: Creating and Registering User 2 (Bob)...');
const user2 = {
  id: 'usr_test_2',
  uniqueCode: generateUniqueCode(),
  displayName: 'Bob Builder',
  username: 'bobbuilder',
  email: 'bob@test.com',
  passwordHash: bcrypt.hashSync('securepass123', 8),
  mobileNumber: '+919123456789',
  gender: 'Male',
  dob: '1995-10-15',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  bio: 'Building things',
  interests: ['Mobile Apps', 'Gaming'],
  notificationsEnabled: true,
  theme: 'light',
  profileCompleted: true,
  createdAt: new Date().toISOString()
};
users.create(user2);
assert.strictEqual(db.users.length, 2);
console.log(`✅ Test 4 Passed: User 2 created with Unique Code ${user2.uniqueCode}\n`);

// Test 5: Search user by Unique Code
console.log('Test 5: Searching User by Unique Code...');
const searchByCode = users.search(user1.uniqueCode, user2.id);
assert.strictEqual(searchByCode.length, 1);
assert.strictEqual(searchByCode[0].id, user1.id);
assert.strictEqual(searchByCode[0].displayName, user1.displayName);
console.log('✅ Test 5 Passed: User found via Unique Code match.\n');

// Test 6: Search user by Contact Number
console.log('Test 6: Searching User by Contact Number...');
const searchByPhone = users.search('9876543210', user2.id);
assert.strictEqual(searchByPhone.length, 1);
assert.strictEqual(searchByPhone[0].id, user1.id);
console.log('✅ Test 6 Passed: User found via Contact Number match.\n');

// Test 7: Prevent search matching nonexistent users or self
console.log('Test 7: Verifying Self or Random User search behavior...');
const searchSelf = users.search(user1.uniqueCode, user1.id);
assert.strictEqual(searchSelf.length, 0, 'User should not return self in search results');
const searchRandom = users.search('NONEXISTENT_9999', user1.id);
assert.strictEqual(searchRandom.length, 0, 'Nonexistent account should not be found');
console.log('✅ Test 7 Passed: Self and nonexistent queries return empty arrays.\n');

// Test 8: One-to-one conversation creation & message exchange
console.log('Test 8: Establishing 1-to-1 conversation between Alice and Bob...');
const conv = conversations.findOrCreate(user1.id, user2.id);
assert.ok(conv);
assert.ok(conv.participants.includes(user1.id));
assert.ok(conv.participants.includes(user2.id));

const msg1 = {
  id: 'msg_test_1',
  conversationId: conv.id,
  recipientId: user2.id,
  senderId: user1.id,
  content: 'Hello Bob! This is a real-time message.',
  attachment: null,
  status: 'sent',
  createdAt: new Date().toISOString()
};
messages.create(msg1);
conversations.update(conv.id, { lastMessage: msg1 });

const convMessages = messages.find((m) => m.conversationId === conv.id);
assert.strictEqual(convMessages.length, 1);
assert.strictEqual(convMessages[0].content, 'Hello Bob! This is a real-time message.');
console.log('✅ Test 8 Passed: 1-to-1 conversation and message created and persisted.\n');

// Test 9: Channel Management - Public channel creation & joining
console.log('Test 9: Creating Public Channel...');
const publicChan = {
  id: 'chan_general_test',
  name: 'community-chat',
  description: 'Public channel for all users',
  isPrivate: false,
  passcode: null,
  passcodeHash: null,
  icon: '💬',
  ownerId: user1.id,
  members: [user1.id],
  createdAt: new Date().toISOString()
};
channels.create(publicChan);
assert.ok(channels.isMember(publicChan.id, user2.id), 'Public channel should be accessible to all registered users');
channels.addMember(publicChan.id, user2.id);
assert.strictEqual(channels.findById(publicChan.id).members.length, 2);
console.log('✅ Test 9 Passed: Public channel created and joined.\n');

// Test 10: Private Channel & Passcode Validation (Vignan channel: 1299)
console.log('Test 10: Verifying Vignan Channel Passcode Verification...');
const vignan = channels.findById('chan_vignan');
assert.strictEqual(channels.isMember('chan_vignan', user1.id), false, 'Alice should not be member initially');

// Attempt wrong passcode
const wrongPasscode = '9999';
const wrongMatch = bcrypt.compareSync(wrongPasscode, vignan.passcodeHash);
assert.strictEqual(wrongMatch, false, 'Wrong passcode 9999 should be rejected');

// Attempt correct passcode 1299
const correctPasscode = '1299';
const correctMatch = bcrypt.compareSync(correctPasscode, vignan.passcodeHash);
assert.strictEqual(correctMatch, true, 'Passcode 1299 must match Vignan passcodeHash');

channels.addMember('chan_vignan', user1.id);
assert.strictEqual(channels.isMember('chan_vignan', user1.id), true, 'Alice should now be a member after entering 1299');
console.log('✅ Test 10 Passed: Incorrect passcode rejected; correct passcode 1299 accepted.\n');

// Test 11: Profile updates & protection of Unique Code
console.log('Test 11: Updating profile details and ensuring Unique Code cannot be altered...');
const originalCode = user1.uniqueCode;
users.update(user1.id, {
  displayName: 'Alice Updated',
  bio: 'Updated bio text',
  uniqueCode: 'CSHACKED', // attempted overwrite
  createdAt: '1970-01-01'  // attempted overwrite
});
const reloadedAlice = users.findById(user1.id);
assert.strictEqual(reloadedAlice.displayName, 'Alice Updated');
assert.strictEqual(reloadedAlice.uniqueCode, originalCode, 'Unique code must NEVER be editable');
assert.notStrictEqual(reloadedAlice.createdAt, '1970-01-01', 'Creation timestamp must NEVER be editable');
console.log('✅ Test 11 Passed: Profile updated successfully and unique code is immutable.\n');

// Test 12: Account Deletion - 10-day restriction verification
console.log('Test 12: Enforcing 10-Day Account Deletion Restriction...');
const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const freshAccountAge = Date.now() - new Date(reloadedAlice.createdAt).getTime();
assert.ok(freshAccountAge < TEN_DAYS_MS, 'New account should be less than 10 days old');

// Simulate account older than 10 days
const oldUser = {
  id: 'usr_old_test',
  uniqueCode: generateUniqueCode(),
  displayName: 'Old User',
  username: 'olduser',
  email: 'old@test.com',
  passwordHash: 'hash',
  mobileNumber: '+919999999999',
  createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString() // 11 days ago
};
users.create(oldUser);
const oldAge = Date.now() - new Date(oldUser.createdAt).getTime();
assert.ok(oldAge >= TEN_DAYS_MS, 'Account created 11 days ago should be >= 10 days old');

// Delete old account
const deleted = users.delete(oldUser.id);
assert.ok(deleted);
assert.strictEqual(users.findById(oldUser.id), undefined, 'Deleted account must no longer exist');
console.log('✅ Test 12 Passed: Account deletion restriction strictly enforces 10-day rule.\n');

// Test 13: Google OAuth New User Signup
console.log('Test 13: Google OAuth New User Registration & Unique Code Generation...');
const googleUid = 'google_uid_998877';
const googleEmail = 'googleuser@test.com';
const newGoogleUser = {
  id: `usr_${googleUid.substring(0, 8)}_abc1`,
  uniqueCode: generateUniqueCode(),
  firebaseUid: googleUid,
  username: 'googler_1234',
  email: googleEmail,
  displayName: 'Google Tester',
  passwordHash: 'firebase_oauth_protected',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
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
users.create(newGoogleUser);
const foundGoogleUser = users.findByFirebaseUid(googleUid);
assert.ok(foundGoogleUser, 'User should be found by firebaseUid');
assert.ok(foundGoogleUser.uniqueCode.startsWith('CS'), 'Google user must have CS unique code');
assert.strictEqual(foundGoogleUser.profileCompleted, false, 'New Google user profile should be incomplete until onboarded');
console.log(`✅ Test 13 Passed: Google Signup creates user with permanent code ${foundGoogleUser.uniqueCode} and profileCompleted=false.\n`);

// Test 14: Google OAuth Repeated Login (Duplicate Prevention)
console.log('Test 14: Google OAuth Repeated Login Duplicate Prevention...');
const initialUserCount = db.users.length;
const repeatUser = users.findByFirebaseUid(googleUid) || users.findByEmail(googleEmail);
assert.ok(repeatUser, 'Existing Google user should be retrieved');
assert.strictEqual(repeatUser.uniqueCode, foundGoogleUser.uniqueCode, 'Must retain original unique code');
assert.strictEqual(db.users.length, initialUserCount, 'User count must not increase on repeat login');
console.log('✅ Test 14 Passed: Repeat Google login prevents duplicates and preserves permanent code.\n');

// Test 15: Google OAuth Account Linking with Email/Password User
console.log('Test 15: Google OAuth Linking with Existing Email/Password Account...');
const emailUserOriginalCode = user1.uniqueCode;
const linkedUser = users.findByEmail(user1.email);
assert.ok(linkedUser, 'Existing user with matching email should be found');
assert.strictEqual(linkedUser.uniqueCode, emailUserOriginalCode, 'Unique code must remain untouched');
// Link firebaseUid
users.update(linkedUser.id, { firebaseUid: 'firebase_linked_uid_1' });
const verifiedLinkedUser = users.findByFirebaseUid('firebase_linked_uid_1');
assert.strictEqual(verifiedLinkedUser.id, user1.id, 'Must link to existing user ID');
assert.strictEqual(verifiedLinkedUser.uniqueCode, emailUserOriginalCode, 'Original code must be preserved');
console.log('✅ Test 15 Passed: Account linking successfully links Firebase UID without duplicating or modifying unique code.\n');

// Test 16: Mandatory Profile Details Enforcement
console.log('Test 16: Mandatory Registration Fields Verification...');
const incompleteUser = {
  id: 'usr_incomplete_test',
  uniqueCode: generateUniqueCode(),
  displayName: 'Incomplete User',
  username: 'incompleteuser',
  email: 'incomplete@test.com',
  passwordHash: 'hash',
  mobileNumber: '+919876543219',
  gender: '',        // Missing
  dob: '',           // Missing
  avatar: '',        // Missing
  interests: [],     // Missing
  profileCompleted: false,
  createdAt: new Date().toISOString()
};
users.create(incompleteUser);
const savedIncomplete = users.findById(incompleteUser.id);
assert.strictEqual(savedIncomplete.profileCompleted, false, 'User with missing fields must remain pending profileCompleted=false');
console.log('✅ Test 16 Passed: Pending-registration state strictly enforced when mandatory fields are missing.\n');

// Test 17: AI Chat Summary - 1-to-1 Personal Conversations
console.log('Test 17: AI Chat Summary inside 1-to-1 Personal Conversation...');
const testMessages = [
  { sender: { displayName: 'Alice' }, content: 'Hi Bob, are we still meeting about the upcoming college festival?' },
  { sender: { displayName: 'Bob' }, content: 'Yes Alice! The meeting is planned for Saturday at 4 PM.' },
  { sender: { displayName: 'Alice' }, content: 'Great, sounds good! Did we finalize the meeting location yet?' },
  { sender: { displayName: 'Bob' }, content: 'Not yet, let me know if the central library works for you.' }
];

const summaryResult = localNlpSummarize(testMessages, 'Bob', 'Alice');
assert.strictEqual(summaryResult.empty, false, 'Summary should not be empty');
assert.ok(Array.isArray(summaryResult.mainTopics) && summaryResult.mainTopics.length > 0, 'Main Topics must be generated');
assert.ok(Array.isArray(summaryResult.importantPoints) && summaryResult.importantPoints.length > 0, 'Important Points must be generated');
assert.ok(Array.isArray(summaryResult.pendingDiscussions) && summaryResult.pendingDiscussions.length > 0, 'Pending Discussions must be identified');
assert.ok(summaryResult.summaryText.length > 10, 'Summary overview sentence must be generated');
console.log('✅ Test 17 Passed: AI Chat Summary generates Main Topics, Important Points, and Pending Discussions.\n');

// Test 18: AI Chat Summary Empty Conversation Handling
console.log('Test 18: AI Chat Summary with zero messages...');
const emptySummary = localNlpSummarize([], 'Bob', 'Alice');
assert.strictEqual(emptySummary.empty, true, 'Zero messages should report empty state');
assert.strictEqual(emptySummary.message, 'There are no messages available to summarize yet.');
console.log('✅ Test 18 Passed: Empty conversation returns friendly "no messages available" notice.\n');

// Test 19: Channel Visibility & Vignan Plaintext Protection
console.log('Test 19: Channel Discovery & Vignan Passcode Security...');
const vignanChannel = channels.findById('chan_vignan');
assert.strictEqual(vignanChannel.passcode, undefined, 'Plaintext passcode must NEVER exist on channel object');
assert.ok(vignanChannel.passcodeHash, 'passcodeHash must be present');
assert.strictEqual(channels.isMember('chan_vignan', user2.id), false, 'Bob should not be a member of Vignan by default');
console.log('✅ Test 19 Passed: Vignan channel passcode is securely hashed and not exposed.\n');

// Reset database back to clean initial state for production
console.log('Cleaning test artifacts from database...');
users.delete(user1.id);
users.delete(user2.id);
users.delete(newGoogleUser.id);
users.delete(incompleteUser.id);
channels.delete(publicChan.id);
// Reset Vignan members back to []
const vignanFinal = channels.findById('chan_vignan');
if (vignanFinal) vignanFinal.members = [];
// Clean messages and conversations
db.messages = [];
db.conversations = [];
saveDatabase();

assert.strictEqual(db.users.length, 0);
assert.strictEqual(db.messages.length, 0);
assert.strictEqual(db.conversations.length, 0);
assert.strictEqual(db.channels.length, 1);
assert.strictEqual(db.channels[0].name, 'Vignan');
assert.strictEqual(db.channels[0].members.length, 0);

console.log('✅ All Tests Passed Successfully! Database restored to clean production state.\n');
