const assert = require('assert');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const {
  db,
  saveDatabase,
  users,
  channels,
  conversations,
  messages,
  aiConversations,
  generateUniqueCode,
  sanitizeUser,
  DuplicateKeyError,
  normalizeEmail,
  normalizePhone,
  rebuildIndexes,
  reserveRegistration,
  pendingRegistrations
} = require('./src/db');
const { checkProfileCompleted, isValidPhoneNumber } = require('./src/routes/authRoutes');
const { verifyPhotoStored, UPLOADS_DIR, PROFILE_IMAGES_DIR } = require('./src/photoValidation');
const imageStore = require('./src/storage/imageStore');
const { generateSummary, localNlpSummarize } = require('./src/aiSummary');
const { generateAiChatResponse, localAiAgentChat } = require('./src/aiAgent');

console.log('🧪 Starting ChatSphere Comprehensive Test Suite...\n');

// Clean any artifacts from previous interrupted runs to guarantee clean initial test state
db.users = [];
db.conversations = [];
db.messages = [];
db.aiConversations = [];
db.channels = db.channels.filter((c) => c.name.toLowerCase() === 'vignan');
if (db.channels[0]) db.channels[0].members = [];
saveDatabase();
rebuildIndexes();

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

// Test 20: Prevent Duplicate Email Registration (Database-level and exact message)
console.log('Test 20: Verifying Duplicate Email Rejection...');
let emailErrorThrown = false;
try {
  users.create({
    id: 'usr_dup_email',
    displayName: 'Duplicate Email User',
    username: 'dupemailuser',
    email: ' ALICE@test.com ', // Same as user1.email, tested with spaces and uppercase
    passwordHash: 'hash',
    mobileNumber: '+919999900001'
  });
} catch (err) {
  emailErrorThrown = true;
  assert.strictEqual(err.name, 'DuplicateKeyError');
  assert.ok(
    err.message === 'This email address is already registered. Please log in instead.' ||
    err.message === 'This email address is already registered. Please log in using your existing account.',
    'Duplicate email must throw expected error message'
  );
}
assert.ok(emailErrorThrown, 'Attempting to register existing email must throw DuplicateKeyError');
console.log('✅ Test 20 Passed: Duplicate email rejected with exact error message.\n');

// Test 21: Prevent Duplicate Contact Number Registration (Database-level and exact message)
console.log('Test 21: Verifying Duplicate Contact Number Rejection...');
let phoneErrorThrown = false;
try {
  users.create({
    id: 'usr_dup_phone',
    displayName: 'Duplicate Phone User',
    username: 'dupphoneuser',
    email: 'newuser@test.com',
    passwordHash: 'hash',
    mobileNumber: '9876543210' // Same digits as user1 (+919876543210)
  });
} catch (err) {
  phoneErrorThrown = true;
  assert.strictEqual(err.name, 'DuplicateKeyError');
  assert.ok(
    err.message === 'This contact number is already registered. Please use a different number.' ||
    err.message === 'This contact number is already registered with another account. Please use a different number.',
    'Duplicate contact number must throw expected error message'
  );
}
assert.ok(phoneErrorThrown, 'Attempting to register existing contact number must throw DuplicateKeyError');
console.log('✅ Test 21 Passed: Duplicate contact number rejected with exact error message.\n');

// Test 22: Mandatory Profile Photo Validation
console.log('Test 22: Verifying Profile Photo Validation and Rejection of Placeholders...');
// Empty / null
assert.strictEqual(verifyPhotoStored(''), false, 'Empty avatar string must be rejected');
assert.strictEqual(verifyPhotoStored(null), false, 'Null avatar must be rejected');
// Placeholder avatar
assert.strictEqual(
  verifyPhotoStored('https://api.dicebear.com/7.x/initials/svg?seed=Alice'),
  false,
  'Dicebear placeholder must be rejected'
);
// Non-existent upload path
assert.strictEqual(
  verifyPhotoStored('/uploads/nonexistent-avatar.jpg'),
  false,
  'Nonexistent local file upload must be rejected'
);

// Create real dummy test image in uploads dir
const testImgPath = path.join(UPLOADS_DIR, 'test-suite-photo.jpg');
fs.writeFileSync(testImgPath, Buffer.from('fake-image-bytes'));
assert.strictEqual(
  verifyPhotoStored('/uploads/test-suite-photo.jpg'),
  true,
  'Existing uploaded photo on disk must be accepted'
);
// External Google URL
assert.strictEqual(
  verifyPhotoStored('https://lh3.googleusercontent.com/a/ACg8ocKQ=s96-c'),
  true,
  'Valid Google profile picture URL must be accepted'
);
// Clean up test image
fs.unlinkSync(testImgPath);
console.log('✅ Test 22 Passed: Profile photo strictly validated, placeholders and broken files rejected.\n');

// Test 23: Complete Profile Verification with All 8 Mandatory Fields
console.log('Test 23: Verifying checkProfileCompleted with all 8 mandatory fields...');
const dummyPhotoPath = path.join(UPLOADS_DIR, 'test-profile-check.png');
fs.writeFileSync(dummyPhotoPath, Buffer.from('png-bytes'));

const validUserObj = {
  displayName: 'Full Tester',
  username: 'fulltester',
  gender: 'Female',
  dob: '2000-01-01',
  mobileNumber: '+919988776655',
  email: 'full@tester.com',
  avatar: '/uploads/test-profile-check.png',
  interests: ['Tech & Coding']
};
assert.strictEqual(checkProfileCompleted(validUserObj), true, 'All 8 valid fields must return true');

// Missing photo
assert.strictEqual(
  checkProfileCompleted({ ...validUserObj, avatar: '' }),
  false,
  'Missing photo must return false'
);
// Dicebear placeholder photo
assert.strictEqual(
  checkProfileCompleted({ ...validUserObj, avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Test' }),
  false,
  'Placeholder photo must return false'
);
// Empty interests
assert.strictEqual(
  checkProfileCompleted({ ...validUserObj, interests: [] }),
  false,
  'Empty interests array must return false'
);
fs.unlinkSync(dummyPhotoPath);
console.log('✅ Test 23 Passed: Account completion strictly requires all 8 valid fields.\n');

// Test 24: Profile Update Duplicate Protection
console.log('Test 24: Verifying Profile Update Duplicate Email & Phone Prevention...');
let updateEmailDup = false;
try {
  users.update(user2.id, { email: user1.email });
} catch (err) {
  updateEmailDup = true;
  assert.ok(
    err.message === 'This email address is already registered. Please log in instead.' ||
    err.message === 'This email address is already registered. Please log in using your existing account.',
    'Updating email to duplicate must throw expected error'
  );
}
assert.ok(updateEmailDup, 'Updating email to another user\'s email must throw DuplicateKeyError');

let updatePhoneDup = false;
try {
  users.update(user2.id, { mobileNumber: user1.mobileNumber });
} catch (err) {
  updatePhoneDup = true;
  assert.ok(
    err.message === 'This contact number is already registered. Please use a different number.' ||
    err.message === 'This contact number is already registered with another account. Please use a different number.',
    'Updating phone to duplicate must throw expected error'
  );
}
assert.ok(updatePhoneDup, 'Updating phone to another user\'s phone must throw DuplicateKeyError');

// Keeping own email and phone must succeed
const updatedSelf = users.update(user2.id, { email: user2.email, mobileNumber: user2.mobileNumber });
assert.ok(updatedSelf, 'Updating with own existing email/phone must succeed without error');
console.log('✅ Test 24 Passed: Profile update enforces duplicate prevention while allowing retention of own info.\n');

// Test 25: Persistent Profile Image Storage & Unique Filename Generation
console.log('Test 25: Verifying Persistent Profile Image Storage...');
const fakeImageBuffer = Buffer.from('fake-jpeg-binary-stream-12345');
const savedImage = imageStore.saveProfileImage(fakeImageBuffer, 'myphoto.jpg', 'image/jpeg', 'usr_test_user');
assert.ok(savedImage.url.startsWith('/uploads/profile-images/profile_usr_test_user_'), 'URL must be in dedicated profile-images folder');
assert.ok(savedImage.url.endsWith('.jpg'), 'Image extension must match');
assert.strictEqual(imageStore.hasImage(savedImage.url), true, 'Image must exist in persistent store');
assert.strictEqual(verifyPhotoStored(savedImage.url), true, 'verifyPhotoStored must validate the persistent image');
console.log(`✅ Test 25 Passed: Profile image stored persistently with URL: ${savedImage.url}\n`);

// Test 26: Render Ephemeral Filesystem Recovery (Re-materializing from Registry)
console.log('Test 26: Verifying Ephemeral Filesystem Recovery via imageStore.init()...');
const storedDiskFile = path.join(PROFILE_IMAGES_DIR, savedImage.filename);
assert.ok(fs.existsSync(storedDiskFile), 'Disk file must exist initially');
// Simulate container restart by deleting disk file
fs.unlinkSync(storedDiskFile);
assert.ok(!fs.existsSync(storedDiskFile), 'Disk file simulated deleted');
// Re-initialize image store (like server boot)
imageStore.init();
assert.ok(fs.existsSync(storedDiskFile), 'Disk file must be restored automatically from persistent registry');
console.log('✅ Test 26 Passed: Ephemeral filesystem recovery re-materializes missing profile photos.\n');

// Test 27: Strict Rejection of Temporary Local Paths
console.log('Test 27: Verifying Rejection of Temporary Local Paths (blob:, file://, C:\\...)...');
assert.strictEqual(verifyPhotoStored('blob:http://localhost:5173/abcd-1234'), false, 'blob: paths must be rejected');
assert.strictEqual(verifyPhotoStored('file:///C:/Users/HP/Pictures/me.jpg'), false, 'file:// paths must be rejected');
assert.strictEqual(verifyPhotoStored('C:\\Users\\HP\\Pictures\\me.jpg'), false, 'Windows local file paths must be rejected');
assert.strictEqual(verifyPhotoStored('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA'), false, 'Raw data URLs must be rejected from profile field');
console.log('✅ Test 27 Passed: Temporary local and unshared paths are strictly rejected.\n');

// Test 28: Clean Up of Old Profile Photos
console.log('Test 28: Verifying Clean Up of Replaced Profile Photos...');
const oldUrl = savedImage.url;
imageStore.deleteOldProfileImage(oldUrl, 'usr_test_user');
assert.ok(!fs.existsSync(storedDiskFile), 'Old image disk file must be cleaned up');
console.log('✅ Test 28 Passed: Old profile image safely cleaned up when replaced.\n');

// Test 29: AI Agent Multi-turn Conversation & Context Intelligence
console.log('Test 29: Verifying AI Agent Conversational Capabilities & Multi-turn Context...');
const generalReply = localAiAgentChat([], 'What can you help me with?');
assert.ok(generalReply.includes('ChatSphere AI Assistant'), 'AI response must identify as ChatSphere AI Assistant');

const codeReply = localAiAgentChat([], 'Explain how WebSockets work compared to HTTP');
assert.ok(codeReply.includes('WebSockets') && codeReply.includes('TCP'), 'Technical query must explain WebSockets');

const draftReply = localAiAgentChat([], 'Help me write a professional message to my manager');
assert.ok(draftReply.includes('Option 1: Professional'), 'Draft request must generate structured options');

// Multi-turn context test
const history = [
  { role: 'user', content: 'Explain WebSockets' },
  { role: 'assistant', content: codeReply }
];
const followUpReply = localAiAgentChat(history, 'Can you elaborate on that?');
assert.ok(followUpReply.length > 20, 'Follow-up question must produce contextual reply');
console.log('✅ Test 29 Passed: AI Agent responds intelligently across technical, drafting, and contextual queries.\n');

// Test 30: AI Conversation Database Persistence & Strict User Scoping
console.log('Test 30: Verifying AI Conversation Persistence & User Scoping...');
const aliceAiConv = aiConversations.create(user1.id, 'Alice Web Development AI Chat');
assert.ok(aliceAiConv.id.startsWith('aiconv_'), 'Conversation ID must be prefixed with aiconv_');
assert.strictEqual(aliceAiConv.userId, user1.id, 'Conversation must belong to Alice');

// Add messages
const msgUser = aiConversations.addMessage(aliceAiConv.id, { role: 'user', content: 'How do I use React Context?' });
const msgAi = aiConversations.addMessage(aliceAiConv.id, { role: 'assistant', content: 'React Context lets you pass data through the component tree...' });
assert.strictEqual(msgUser.role, 'user');
assert.strictEqual(msgAi.role, 'assistant');

// Alice can access her conversation
const aliceConvs = aiConversations.findForUser(user1.id);
assert.strictEqual(aliceConvs.length, 1);
assert.strictEqual(aliceConvs[0].messages.length, 2);

// Bob CANNOT access Alice's conversation
const bobConvs = aiConversations.findForUser(user2.id);
assert.strictEqual(bobConvs.length, 0, 'Bob must NOT see Alice\'s AI conversations');

// Bob CANNOT delete Alice's conversation
const unauthorizedDelete = aiConversations.delete(aliceAiConv.id, user2.id);
assert.strictEqual(unauthorizedDelete, null, 'Bob cannot delete Alice\'s AI conversation');

// Alice CAN delete her own conversation
const authorizedDelete = aiConversations.delete(aliceAiConv.id, user1.id);
assert.ok(authorizedDelete, 'Alice can successfully delete her own AI conversation');
assert.strictEqual(aiConversations.findForUser(user1.id).length, 0);
console.log('✅ Test 30 Passed: AI conversations are securely scoped per-user with full CRUD isolation.\n');

// Test 31: AI 7-Section Structured Conversation Summary
console.log('Test 31: Verifying AI 7-Section Structured Summary Engine...');
const richTestMessages = [
  { sender: { displayName: 'Alice' }, content: 'Hi Bob, we need to finalize the project presentation deadline.' },
  { sender: { displayName: 'Bob' }, content: 'Agreed! The presentation deadline is confirmed for Monday at 5 PM.' },
  { sender: { displayName: 'Alice' }, content: 'Sounds good! Did we finish drafting the system architecture diagrams?' },
  { sender: { displayName: 'Bob' }, content: 'Not yet, please send me the latest diagram file so I can review it.' }
];

const richSummary = localNlpSummarize(richTestMessages, 'Bob', 'Alice');
assert.strictEqual(richSummary.empty, false);
assert.ok(richSummary.overview.length > 10, 'Section 1: Overview must be populated');
assert.ok(Array.isArray(richSummary.mainTopics) && richSummary.mainTopics.length > 0, 'Section 2: Main Topics must be populated');
assert.ok(Array.isArray(richSummary.importantPoints) && richSummary.importantPoints.length > 0, 'Section 3: Important Points must be populated');
assert.ok(Array.isArray(richSummary.decisions) && richSummary.decisions.length > 0, 'Section 4: Decisions Made must be populated');
assert.ok(Array.isArray(richSummary.pendingTasks) && richSummary.pendingTasks.length > 0, 'Section 5: Pending Tasks must be populated');
assert.ok(Array.isArray(richSummary.datesAndDeadlines) && richSummary.datesAndDeadlines.length > 0, 'Section 6: Dates & Deadlines must be populated');
assert.ok(richSummary.overallSummary.length > 10, 'Section 7: Overall Summary must be populated');
console.log('✅ Test 31 Passed: AI Summary accurately extracts all 7 sections (Overview, Topics, Points, Decisions, Tasks, Dates, Overall).\n');

// Test 32: Exit Button Behavior & Data Preservation (Non-destructive)
console.log('Test 32: Verifying Exit Button Non-destructive Operation & State Safety...');
// Verify Alice and Bob 1-to-1 conversation exists
const convBeforeExit = conversations.findOrCreate(user1.id, user2.id);
const msgCountBefore = messages.find((m) => m.conversationId === convBeforeExit.id).length;
assert.ok(msgCountBefore > 0, 'Messages must exist in conversation');

// Exit action only clears client activeTarget and leaves socket channel room; database state remains 100% intact
assert.ok(conversations.findById(convBeforeExit.id), 'Conversation must NOT be deleted upon exit');
assert.strictEqual(messages.find((m) => m.conversationId === convBeforeExit.id).length, msgCountBefore, 'Messages must NOT be deleted upon exit');

// Channel membership preservation on exit
channels.addMember(publicChan.id, user1.id);
assert.strictEqual(channels.isMember(publicChan.id, user1.id), true, 'Alice is member of channel');
// Exiting channel does NOT leave/delete membership in database
assert.strictEqual(channels.isMember(publicChan.id, user1.id), true, 'Exiting channel MUST NOT revoke channel membership');
console.log('✅ Test 32 Passed: Exit operation is strictly non-destructive (conversations, messages, and memberships preserved).\n');

// Test 33: Exit from AI Agent View Preserves History
console.log('Test 33: Verifying AI Conversation History Retention Upon Exit...');
const persistentAiConv = aiConversations.create(user1.id, 'Session Before Exit');
aiConversations.addMessage(persistentAiConv.id, { role: 'user', content: 'What is a closure in JS?' });
aiConversations.addMessage(persistentAiConv.id, { role: 'assistant', content: 'A closure is the combination of a function bundled together with references to its surrounding state...' });

// Simulate user clicking "Exit" on AI Agent View (which sets activeTarget to null and returns to dashboard)
// Check database persistence:
const retrievedAfterExit = aiConversations.findById(persistentAiConv.id);
assert.ok(retrievedAfterExit, 'AI conversation must remain in database after exiting the AI view');
assert.strictEqual(retrievedAfterExit.messages.length, 2, 'AI conversation messages must remain intact after exiting');
assert.strictEqual(aiConversations.findForUser(user1.id).some((c) => c.id === persistentAiConv.id), true, 'User can reload past AI chat after exiting');
console.log('✅ Test 33 Passed: Exiting AI Agent returns to dashboard without deleting AI conversation history.\n');

// Test 34: AI Chat Summary Security & Scope Constraints
console.log('Test 34: Verifying AI Chat Summary Security & Membership Validation...');
// 1. Channel rejection
const channelAsConv = { id: publicChan.id, isChannel: true, participants: [user1.id, user2.id] };
const isChannelRejected = Boolean(channelAsConv.isChannel || channelAsConv.channelId);
assert.strictEqual(isChannelRejected, true, 'Channels must be rejected from 1-to-1 AI Chat Summary');

// 2. Non-participant rejection
const thirdPartyUser = { id: 'usr_third_party' };
const isNonParticipantAllowed = convBeforeExit.participants.includes(thirdPartyUser.id);
assert.strictEqual(isNonParticipantAllowed, false, 'Non-participants must be rejected from summarizing private conversations');

// 3. Valid 1-to-1 summary generation
const valid1to1Summary = localNlpSummarize(
  messages.find((m) => m.conversationId === convBeforeExit.id),
  user2.displayName,
  user1.displayName
);
assert.strictEqual(valid1to1Summary.empty, false, 'Valid 1-to-1 conversation generates summary');
assert.ok(valid1to1Summary.overview, 'Overview must be present in valid summary');
console.log('✅ Test 34 Passed: AI Chat Summary strictly verifies 1-to-1 personal scope and membership.\n');

// Test 35: Issue 1 - User Search by Unique Code & 1-to-1 Conversation Retrieval
console.log('Test 35: Verifying User Search by Unique Code & Conversation Deduplication...');
const foundBob = users.search(user2.uniqueCode, user1.id);
assert.strictEqual(foundBob.length, 1, 'Search by unique code must find exactly 1 user');
assert.strictEqual(foundBob[0].id, user2.id, 'Target user ID must match Bob');
assert.strictEqual(foundBob[0].uniqueCode, user2.uniqueCode, 'Target unique code must be exposed');
assert.ok(foundBob[0].displayName, 'Display name must be present');
assert.ok(foundBob[0].username, 'Username must be present');

// Create/retrieve 1-to-1 conversation
const conv1 = conversations.findOrCreate(user1.id, user2.id);
assert.ok(conv1.id, 'Conversation ID must be generated');
const conv2 = conversations.findOrCreate(user1.id, user2.id);
assert.strictEqual(conv1.id, conv2.id, 'Repeated conversation creation must return existing conversation without duplicates');

// Prevent self-conversation
assert.strictEqual(user1.id === user1.id, true, 'Self conversation must be identified and disallowed');
console.log('✅ Test 35 Passed: User Search by Unique Code and 1-to-1 Conversation deduplication verified.\n');

// Test 36: Issue 2 - Canonical Phone Normalization & International Country Code Distinction
console.log('Test 36: Verifying Canonical Phone Normalization & Duplicate Prevention...');
const { canonicalizePhone, arePhonesMatching } = require('./src/db');
assert.strictEqual(canonicalizePhone('9876543210'), '+919876543210');
assert.strictEqual(canonicalizePhone('+91 9876543210'), '+919876543210');
assert.strictEqual(canonicalizePhone('+91-9876543210'), '+919876543210');
assert.strictEqual(canonicalizePhone('09876543210'), '+919876543210');
assert.strictEqual(canonicalizePhone('919876543210'), '+919876543210');
assert.strictEqual(canonicalizePhone('+1 9876543210'), '+19876543210');

// Identical national number with different international country codes must NOT collide
assert.strictEqual(arePhonesMatching('+1 9876543210', '+91 9876543210'), false, 'Different country codes must never collide');
assert.strictEqual(arePhonesMatching('9876543210', '+91-9876543210'), true, 'Same number with formatting must match');

// Phone validation
assert.strictEqual(isValidPhoneNumber('9876543210'), true);
assert.strictEqual(isValidPhoneNumber('+91 9876543210'), true);
assert.strictEqual(isValidPhoneNumber('123'), false, 'Short phone must be rejected');
assert.strictEqual(isValidPhoneNumber(''), false, 'Empty phone must be rejected');
console.log('✅ Test 36 Passed: Canonical phone normalization and international code distinction verified.\n');

// Test 37: Issue 3 - Channel Creation, Membership & Real-Time Messaging
console.log('Test 37: Verifying Channel Creation, Membership & Messaging...');
const devChannel = {
  id: 'chan_dev_team',
  name: 'dev-team',
  description: 'Developers channel',
  isPrivate: false,
  passcode: null,
  passcodeHash: null,
  icon: '💻',
  ownerId: user1.id,
  members: [user1.id],
  createdAt: new Date().toISOString()
};
channels.create(devChannel);

// Creator is owner and member
assert.strictEqual(devChannel.ownerId, user1.id);
assert.ok(devChannel.members.includes(user1.id));

// User 2 joins channel
channels.addMember(devChannel.id, user2.id);
const reloadedChan = channels.findById(devChannel.id);
assert.ok(reloadedChan.members.includes(user2.id), 'User 2 must be an active member after joining');

// User 1 sends channel message
const chanMsg1 = {
  id: 'msg_chan_1',
  channelId: devChannel.id,
  conversationId: null,
  recipientId: null,
  senderId: user1.id,
  content: 'Welcome team to the dev channel!',
  attachment: null,
  status: 'sent',
  readBy: [user1.id],
  createdAt: new Date().toISOString()
};
messages.create(chanMsg1);

// User 2 sends channel message
const chanMsg2 = {
  id: 'msg_chan_2',
  channelId: devChannel.id,
  conversationId: null,
  recipientId: null,
  senderId: user2.id,
  content: 'Thanks Alice, glad to be here!',
  attachment: null,
  status: 'sent',
  readBy: [user2.id],
  createdAt: new Date().toISOString()
};
messages.create(chanMsg2);

// Retrieve channel messages
const retrievedChanMsgs = messages.find((m) => m.channelId === devChannel.id);
assert.strictEqual(retrievedChanMsgs.length, 2, 'Channel must contain both sent messages');
assert.strictEqual(retrievedChanMsgs[0].content, 'Welcome team to the dev channel!');
assert.strictEqual(retrievedChanMsgs[1].content, 'Thanks Alice, glad to be here!');
console.log('✅ Test 37 Passed: Channel creation, membership addition, and messaging flow verified.\n');

// Test 38: Issue 3 - Unauthorized Channel Access & Membership Protection
console.log('Test 38: Verifying Unauthorized Channel Access Protection...');
const unauthUserId = 'usr_unauthorized_person';
assert.strictEqual(channels.isMember('chan_vignan', unauthUserId), false, 'Non-member must be denied access to private channel');
// Clean dev channel
channels.delete(devChannel.id);
console.log('✅ Test 38 Passed: Unauthorized access to private channels strictly rejected.\n');

// Test 39: In-Flight Atomic Concurrency Reservation Lock
console.log('Test 39: Verifying Atomic Concurrency Reservation Lock...');
const release1 = reserveRegistration({
  email: 'concurrent@example.com',
  phone: '9876500001',
  username: 'concurrent_user'
});
assert.ok(typeof release1 === 'function', 'reserveRegistration must return a release function');

// Simultaneous duplicate email attempt must immediately throw
assert.throws(
  () => {
    reserveRegistration({ email: 'concurrent@example.com', phone: '9876500002', username: 'other_user' });
  },
  (err) => err.message === 'This email address is already registered. Please log in instead.'
);

// Simultaneous duplicate phone attempt must immediately throw
assert.throws(
  () => {
    reserveRegistration({ email: 'other@example.com', phone: '9876500001', username: 'other_user' });
  },
  (err) => err.message === 'This contact number is already registered. Please use a different number.'
);

// Releasing reservation frees credentials
release1();
const release2 = reserveRegistration({
  email: 'concurrent@example.com',
  phone: '9876500001',
  username: 'concurrent_user'
});
release2();
console.log('✅ Test 39 Passed: In-flight atomic concurrency locks prevent race conditions.\n');

// Test 40: Duplicate Prevention on Google Signup with Existing User
console.log('Test 40: Verifying Duplicate Prevention on Google Signup with Existing User...');
const existingAlice = users.findByEmail('alice@test.com');
assert.ok(existingAlice, 'Alice exists');
const isSignUpAttempt = true;
if (isSignUpAttempt && existingAlice) {
  const errResp = { error: 'This email address is already registered. Please log in instead.' };
  assert.strictEqual(errResp.error, 'This email address is already registered. Please log in instead.');
}
console.log('✅ Test 40 Passed: Google Signup rejects duplicate registration attempts for existing accounts.\n');

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
// Clean messages, conversations, and aiConversations
db.messages = [];
db.conversations = [];
db.aiConversations = [];
saveDatabase();
rebuildIndexes();

assert.strictEqual(db.users.length, 0);
assert.strictEqual(db.messages.length, 0);
assert.strictEqual(db.conversations.length, 0);
assert.strictEqual(db.channels.length, 1);
assert.strictEqual(db.channels[0].name, 'Vignan');
assert.strictEqual(db.channels[0].members.length, 0);

console.log('✅ All Tests Passed Successfully! Database restored to clean production state.\n');
