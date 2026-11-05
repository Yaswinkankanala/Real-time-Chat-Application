/**
 * Standalone Data Reset Script
 * Usage: node backend/scripts/resetData.js [--confirm]
 */
const { inspectCurrentRecords, executeReset, createBackup } = require('../src/resetUtil');

const isConfirmed = process.argv.includes('--confirm');

console.log('====================================================');
console.log('   ChatSphere Database Reset & Inspection Utility   ');
console.log('====================================================');

const records = inspectCurrentRecords();
console.log('\n📊 Current Database Contents:');
console.log(`- Users:            ${records.users?.length || 0}`);
console.log(`- Channels:         ${records.channels?.length || 0}`);
console.log(`- Conversations:    ${records.conversations?.length || 0}`);
console.log(`- Messages:         ${records.messages?.length || 0}`);
console.log(`- AI Conversations: ${records.aiConversations?.length || 0}`);

if (!isConfirmed) {
  console.log('\n⚠️ Confirmation Required:');
  console.log('To execute the reset, run: node backend/scripts/resetData.js --confirm');
  const backup = createBackup();
  console.log(`✅ Pre-reset backup generated: ${backup}`);
  process.exit(0);
}

console.log('\n🚀 Executing Confirmed Database Reset...');
const result = executeReset();
console.log(`✅ Backup created at: ${result.backupFile}`);
console.log('✅ Database reset to clean state with default private Vignan channel (passcode 1299).');
console.log('Reset summary:', JSON.stringify(result.deletedCounts, null, 2));

