#!/usr/bin/env node

/**
 * MESSAGING SYSTEM - BOTH SIDES TEST
 * Tests that messages can be sent and received by both parties
 */

const mysql = require('mysql2/promise');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ddrems',
  port: process.env.DB_PORT || 3307
};

let connection;
let testsPassed = 0;
let testsFailed = 0;

function success(msg) {
  console.log(`✅ ${msg}`);
  testsPassed++;
}

function error(msg) {
  console.log(`❌ ${msg}`);
  testsFailed++;
}

function info(msg) {
  console.log(`ℹ️  ${msg}`);
}

function section(title) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 ${title}`);
  console.log('='.repeat(80));
}

async function connectDB() {
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    success('Connected to database');
    return true;
  } catch (err) {
    error(`Database connection failed: ${err.message}`);
    return false;
  }
}

async function getUsers() {
  try {
    const response = await axios.get(`${API_BASE}/users`);
    const users = response.data.filter(u => u.id !== null);
    
    if (users.length < 2) {
      error(`Not enough users (found ${users.length}, need 2)`);
      return null;
    }

    info(`Found ${users.length} users`);
    return users;
  } catch (err) {
    error(`Failed to get users: ${err.message}`);
    return null;
  }
}

async function testSingleMessage(sender, receiver) {
  section('TEST 1: SINGLE MESSAGE - SENDER TO RECEIVER');

  info(`Sender: ${sender.name} (ID: ${sender.id})`);
  info(`Receiver: ${receiver.name} (ID: ${receiver.id})`);

  try {
    // Step 1: Send message
    info('\nStep 1: Sending message from sender...');
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=${sender.id}`, {
      sender_id: sender.id,
      receiver_id: receiver.id,
      subject: 'Test Single Message',
      message: 'This is a test message from sender to receiver',
      message_type: 'general'
    });

    if (!sendResponse.data.success) {
      error(`Send failed: ${sendResponse.data.message}`);
      return false;
    }

    const messageId = sendResponse.data.id;
    success(`Message sent (ID: ${messageId})`);

    // Step 2: Verify in database
    info('\nStep 2: Verifying message in database...');
    const [dbMessages] = await connection.query(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (dbMessages.length === 0) {
      error('Message not found in database');
      return false;
    }

    const msg = dbMessages[0];
    success(`Message found in database`);
    info(`  - sender_id: ${msg.sender_id} (expected: ${sender.id})`);
    info(`  - receiver_id: ${msg.receiver_id} (expected: ${receiver.id})`);
    info(`  - is_group: ${msg.is_group} (expected: 0)`);
    info(`  - is_read: ${msg.is_read} (expected: 0)`);

    if (msg.sender_id !== sender.id) {
      error(`Sender ID mismatch: ${msg.sender_id} !== ${sender.id}`);
      return false;
    }

    if (msg.receiver_id !== receiver.id) {
      error(`Receiver ID mismatch: ${msg.receiver_id} !== ${receiver.id}`);
      return false;
    }

    if (msg.is_group !== 0) {
      error(`is_group should be 0, got ${msg.is_group}`);
      return false;
    }

    success('Message data verified');

    // Step 3: Receiver retrieves messages
    info('\nStep 3: Receiver retrieving messages...');
    const receiverResponse = await axios.get(
      `${API_BASE}/messages/user/${receiver.id}?userId=${receiver.id}`
    );

    const receivedMessages = receiverResponse.data;
    const foundMessage = receivedMessages.find(m => m.id === messageId);

    if (!foundMessage) {
      error('Receiver cannot see the message');
      return false;
    }

    success(`Receiver can see message (found in ${receivedMessages.length} messages)`);

    // Step 4: Receiver marks as read
    info('\nStep 4: Receiver marking message as read...');
    await axios.put(`${API_BASE}/messages/read/${messageId}?userId=${receiver.id}`);
    success('Message marked as read');

    // Step 5: Verify read status
    info('\nStep 5: Verifying read status in database...');
    const [updatedMessages] = await connection.query(
      'SELECT is_read FROM messages WHERE id = ?',
      [messageId]
    );

    if (updatedMessages[0].is_read === 1) {
      success('Read status updated in database');
    } else {
      error('Read status not updated');
      return false;
    }

    // Step 6: Verify unread count
    info('\nStep 6: Checking unread count...');
    const unreadResponse = await axios.get(
      `${API_BASE}/messages/unread/${receiver.id}?userId=${receiver.id}`
    );

    info(`Receiver has ${unreadResponse.data.count} unread messages`);
    success('Unread count retrieved');

    return true;
  } catch (err) {
    error(`Test failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testGroupMessage(sender, receivers) {
  section('TEST 2: GROUP MESSAGE - SENDER TO MULTIPLE RECEIVERS');

  info(`Sender: ${sender.name} (ID: ${sender.id})`);
  info(`Receivers: ${receivers.map(r => `${r.name} (${r.id})`).join(', ')}`);

  try {
    // Step 1: Send group message
    info('\nStep 1: Sending group message...');
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=${sender.id}`, {
      sender_id: sender.id,
      receiver_ids: receivers.map(r => r.id),
      subject: 'Test Group Message',
      message: 'This is a test group message to multiple receivers',
      message_type: 'general',
      is_group: true
    });

    if (!sendResponse.data.success) {
      error(`Send failed: ${sendResponse.data.message}`);
      return false;
    }

    const messageId = sendResponse.data.id;
    success(`Group message sent (ID: ${messageId})`);

    // Step 2: Verify in messages table
    info('\nStep 2: Verifying message in messages table...');
    const [dbMessages] = await connection.query(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (dbMessages.length === 0) {
      error('Message not found in database');
      return false;
    }

    const msg = dbMessages[0];
    success('Message found in messages table');
    info(`  - sender_id: ${msg.sender_id}`);
    info(`  - receiver_id: ${msg.receiver_id} (should be NULL for group)`);
    info(`  - is_group: ${msg.is_group} (should be 1)`);

    if (msg.is_group !== 1) {
      error(`is_group should be 1, got ${msg.is_group}`);
      return false;
    }

    // Step 3: Verify recipients in message_recipients table
    info('\nStep 3: Verifying recipients in message_recipients table...');
    const [recipients] = await connection.query(
      'SELECT user_id FROM message_recipients WHERE message_id = ?',
      [messageId]
    );

    if (recipients.length !== receivers.length) {
      error(`Expected ${receivers.length} recipients, found ${recipients.length}`);
      return false;
    }

    success(`Found ${recipients.length} recipients in message_recipients table`);
    recipients.forEach((r, idx) => {
      info(`  - Recipient ${idx + 1}: User ID ${r.user_id}`);
    });

    // Step 4: Each receiver retrieves messages
    info('\nStep 4: Each receiver retrieving messages...');
    for (const receiver of receivers) {
      const receiverResponse = await axios.get(
        `${API_BASE}/messages/user/${receiver.id}?userId=${receiver.id}`
      );

      const foundMessage = receiverResponse.data.find(m => m.id === messageId);
      if (foundMessage) {
        success(`Receiver ${receiver.name} can see the group message`);
      } else {
        error(`Receiver ${receiver.name} cannot see the group message`);
        return false;
      }
    }

    // Step 5: Each receiver marks as read
    info('\nStep 5: Each receiver marking message as read...');
    for (const receiver of receivers) {
      await axios.put(`${API_BASE}/messages/read/${messageId}?userId=${receiver.id}`);
      success(`Receiver ${receiver.name} marked message as read`);
    }

    // Step 6: Verify read status for each recipient
    info('\nStep 6: Verifying read status for each recipient...');
    const [readRecipients] = await connection.query(
      'SELECT user_id, is_read FROM message_recipients WHERE message_id = ?',
      [messageId]
    );

    let allRead = true;
    readRecipients.forEach(r => {
      if (r.is_read === 1) {
        info(`  - User ${r.user_id}: read ✓`);
      } else {
        info(`  - User ${r.user_id}: unread ✗`);
        allRead = false;
      }
    });

    if (allRead) {
      success('All recipients marked as read');
    } else {
      error('Some recipients not marked as read');
      return false;
    }

    return true;
  } catch (err) {
    error(`Test failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testBothSidesCanSee(user1, user2) {
  section('TEST 3: BOTH SIDES CAN SEE MESSAGES');

  info(`User 1: ${user1.name} (ID: ${user1.id})`);
  info(`User 2: ${user2.name} (ID: ${user2.id})`);

  try {
    // User 1 sends to User 2
    info('\nStep 1: User 1 sends message to User 2...');
    const msg1Response = await axios.post(`${API_BASE}/messages?userId=${user1.id}`, {
      sender_id: user1.id,
      receiver_id: user2.id,
      subject: 'Message from User 1',
      message: 'Hello from User 1',
      message_type: 'general'
    });

    if (!msg1Response.data.success) {
      error(`User 1 send failed: ${msg1Response.data.message}`);
      return false;
    }

    success('User 1 sent message to User 2');

    // User 2 sends to User 1
    info('\nStep 2: User 2 sends message to User 1...');
    const msg2Response = await axios.post(`${API_BASE}/messages?userId=${user2.id}`, {
      sender_id: user2.id,
      receiver_id: user1.id,
      subject: 'Message from User 2',
      message: 'Hello from User 2',
      message_type: 'general'
    });

    if (!msg2Response.data.success) {
      error(`User 2 send failed: ${msg2Response.data.message}`);
      return false;
    }

    success('User 2 sent message to User 1');

    // User 1 retrieves messages
    info('\nStep 3: User 1 retrieving messages...');
    const user1Messages = await axios.get(
      `${API_BASE}/messages/user/${user1.id}?userId=${user1.id}`
    );

    const user1CanSeeMsg2 = user1Messages.data.some(m => m.id === msg2Response.data.id);
    if (user1CanSeeMsg2) {
      success(`User 1 can see message from User 2`);
    } else {
      error(`User 1 cannot see message from User 2`);
      return false;
    }

    // User 2 retrieves messages
    info('\nStep 4: User 2 retrieving messages...');
    const user2Messages = await axios.get(
      `${API_BASE}/messages/user/${user2.id}?userId=${user2.id}`
    );

    const user2CanSeeMsg1 = user2Messages.data.some(m => m.id === msg1Response.data.id);
    if (user2CanSeeMsg1) {
      success(`User 2 can see message from User 1`);
    } else {
      error(`User 2 cannot see message from User 1`);
      return false;
    }

    info(`\nUser 1 has ${user1Messages.data.length} total messages`);
    info(`User 2 has ${user2Messages.data.length} total messages`);

    return true;
  } catch (err) {
    error(`Test failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function generateReport() {
  section('TEST RESULTS SUMMARY');

  const total = testsPassed + testsFailed;
  const percentage = total > 0 ? Math.round((testsPassed / total) * 100) : 0;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`Passed: ${testsPassed} ✅`);
  console.log(`Failed: ${testsFailed} ❌`);
  console.log(`Success Rate: ${percentage}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Messaging system is working correctly.');
    console.log('✅ Both sides can send and receive messages');
    console.log('✅ Messages are stored correctly in database');
    console.log('✅ Read status is tracked properly');
    console.log('✅ Group messages work correctly');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('MESSAGING SYSTEM - BOTH SIDES TEST');
  console.log('Testing that messages can be sent and received by both parties');
  console.log('='.repeat(80));

  // Connect to database
  if (!await connectDB()) {
    process.exit(1);
  }

  // Get users
  const users = await getUsers();
  if (!users || users.length < 2) {
    process.exit(1);
  }

  const sender = users[0];
  const receiver = users[1];
  const thirdUser = users.length > 2 ? users[2] : null;

  // Test 1: Single message
  const test1 = await testSingleMessage(sender, receiver);

  // Test 2: Group message (if we have 3+ users)
  let test2 = true;
  if (thirdUser) {
    test2 = await testGroupMessage(sender, [receiver, thirdUser]);
  } else {
    info('Skipping group message test (need 3+ users)');
  }

  // Test 3: Both sides can send and receive
  const test3 = await testBothSidesCanSee(sender, receiver);

  // Generate report
  await generateReport();

  // Close connection
  if (connection) {
    await connection.end();
  }

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
