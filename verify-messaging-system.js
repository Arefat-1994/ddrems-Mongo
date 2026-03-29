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
let testResults = {
  database: [],
  api: [],
  endToEnd: []
};

async function log(section, message, status = 'info') {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  console.log(`${icons[status]} [${section}] ${message}`);
  testResults[section.toLowerCase()] = testResults[section.toLowerCase()] || [];
  testResults[section.toLowerCase()].push({ message, status });
}

async function connectDB() {
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    await log('Database', 'Connected to database', 'success');
    return true;
  } catch (error) {
    await log('Database', `Connection failed: ${error.message}`, 'error');
    return false;
  }
}

async function verifyTables() {
  try {
    // Check messages table
    const [messagesTable] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'messages' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [DB_CONFIG.database]);

    if (messagesTable.length === 0) {
      await log('Database', 'Messages table not found', 'error');
      return false;
    }

    await log('Database', `Messages table found with ${messagesTable.length} columns`, 'success');

    // Verify required columns
    const requiredColumns = ['id', 'sender_id', 'receiver_id', 'subject', 'message', 'is_group', 'is_read', 'created_at'];
    const existingColumns = messagesTable.map(col => col.COLUMN_NAME);
    
    for (const col of requiredColumns) {
      if (existingColumns.includes(col)) {
        await log('Database', `✓ Column '${col}' exists`, 'success');
      } else {
        await log('Database', `✗ Column '${col}' missing`, 'error');
      }
    }

    // Check message_recipients table
    const [recipientsTable] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'message_recipients' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [DB_CONFIG.database]);

    if (recipientsTable.length === 0) {
      await log('Database', 'Message_recipients table not found', 'error');
      return false;
    }

    await log('Database', `Message_recipients table found with ${recipientsTable.length} columns`, 'success');

    // Check notifications table
    const [notificationsTable] = await connection.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'notifications' AND TABLE_SCHEMA = ?
    `, [DB_CONFIG.database]);

    if (notificationsTable.length === 0) {
      await log('Database', 'Notifications table not found', 'error');
      return false;
    }

    await log('Database', `Notifications table found with ${notificationsTable.length} columns`, 'success');

    return true;
  } catch (error) {
    await log('Database', `Table verification failed: ${error.message}`, 'error');
    return false;
  }
}

async function verifyIndexes() {
  try {
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_NAME = 'messages' AND TABLE_SCHEMA = ?
      ORDER BY INDEX_NAME
    `, [DB_CONFIG.database]);

    const requiredIndexes = ['idx_receiver', 'idx_sender', 'idx_created', 'idx_is_group'];
    const existingIndexes = [...new Set(indexes.map(idx => idx.INDEX_NAME))];

    for (const idx of requiredIndexes) {
      if (existingIndexes.includes(idx)) {
        await log('Database', `✓ Index '${idx}' exists`, 'success');
      } else {
        await log('Database', `✗ Index '${idx}' missing`, 'warning');
      }
    }

    return true;
  } catch (error) {
    await log('Database', `Index verification failed: ${error.message}`, 'error');
    return false;
  }
}

async function checkDataIntegrity() {
  try {
    // Check for orphaned messages
    const [orphaned] = await connection.query(`
      SELECT COUNT(*) as count FROM messages m
      WHERE m.sender_id NOT IN (SELECT id FROM users)
      OR (m.receiver_id IS NOT NULL AND m.receiver_id NOT IN (SELECT id FROM users))
    `);

    if (orphaned[0].count === 0) {
      await log('Database', 'No orphaned messages found', 'success');
    } else {
      await log('Database', `Found ${orphaned[0].count} orphaned messages`, 'warning');
    }

    // Check message counts
    const [counts] = await connection.query(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(CASE WHEN is_group = 0 THEN 1 ELSE 0 END) as single_messages,
        SUM(CASE WHEN is_group = 1 THEN 1 ELSE 0 END) as group_messages,
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_messages,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_messages
      FROM messages
    `);

    await log('Database', `Total messages: ${counts[0].total_messages}`, 'info');
    await log('Database', `Single messages: ${counts[0].single_messages || 0}`, 'info');
    await log('Database', `Group messages: ${counts[0].group_messages || 0}`, 'info');
    await log('Database', `Read messages: ${counts[0].read_messages || 0}`, 'info');
    await log('Database', `Unread messages: ${counts[0].unread_messages || 0}`, 'info');

    return true;
  } catch (error) {
    await log('Database', `Data integrity check failed: ${error.message}`, 'error');
    return false;
  }
}

async function testAPIEndpoints() {
  try {
    // Get all users
    const usersResponse = await axios.get(`${API_BASE}/users`);
    const users = usersResponse.data;
    
    if (users.length < 2) {
      await log('API', 'Not enough users for testing (need at least 2)', 'error');
      return false;
    }

    await log('API', `Found ${users.length} users`, 'success');

    const sender = users[0];
    const receiver = users[1];

    await log('API', `Sender: ${sender.name} (ID: ${sender.id}, Role: ${sender.role})`, 'info');
    await log('API', `Receiver: ${receiver.name} (ID: ${receiver.id}, Role: ${receiver.role})`, 'info');

    // Test 1: Send single message
    try {
      const singleResponse = await axios.post(`${API_BASE}/messages?userId=${sender.id}`, {
        receiver_id: receiver.id,
        subject: 'Test Single Message',
        message: 'This is a test single message',
        message_type: 'general'
      });

      if (singleResponse.data.success) {
        await log('API', `✓ Single message sent (ID: ${singleResponse.data.id})`, 'success');
      } else {
        await log('API', `✗ Single message failed: ${singleResponse.data.message}`, 'error');
      }
    } catch (error) {
      await log('API', `✗ Single message error: ${error.response?.data?.message || error.message}`, 'error');
    }

    // Test 2: Get messages
    try {
      const messagesResponse = await axios.get(`${API_BASE}/messages/user/${receiver.id}?userId=${receiver.id}`);
      await log('API', `✓ Retrieved ${messagesResponse.data.length} messages for receiver`, 'success');
    } catch (error) {
      await log('API', `✗ Get messages error: ${error.response?.data?.message || error.message}`, 'error');
    }

    // Test 3: Get unread count
    try {
      const unreadResponse = await axios.get(`${API_BASE}/messages/unread/${receiver.id}?userId=${receiver.id}`);
      await log('API', `✓ Unread count: ${unreadResponse.data.count}`, 'success');
    } catch (error) {
      await log('API', `✗ Get unread count error: ${error.response?.data?.message || error.message}`, 'error');
    }

    return true;
  } catch (error) {
    await log('API', `API testing failed: ${error.message}`, 'error');
    return false;
  }
}

async function testEndToEnd() {
  try {
    // Get users
    const usersResponse = await axios.get(`${API_BASE}/users`);
    const users = usersResponse.data;

    if (users.length < 3) {
      await log('EndToEnd', 'Not enough users for end-to-end test (need at least 3)', 'error');
      return false;
    }

    const sender = users[0];
    const receiver1 = users[1];
    const receiver2 = users[2];

    // Step 1: Send group message
    await log('EndToEnd', 'Step 1: Sending group message...', 'info');
    
    const groupResponse = await axios.post(`${API_BASE}/messages?userId=${sender.id}`, {
      receiver_ids: [receiver1.id, receiver2.id],
      subject: 'Test Group Message',
      message: 'This is a test group message to multiple users',
      message_type: 'general',
      is_group: true
    });

    if (!groupResponse.data.success) {
      await log('EndToEnd', `Group message failed: ${groupResponse.data.message}`, 'error');
      return false;
    }

    const messageId = groupResponse.data.id;
    await log('EndToEnd', `✓ Group message sent (ID: ${messageId})`, 'success');

    // Step 2: Verify message in database
    await log('EndToEnd', 'Step 2: Verifying message in database...', 'info');
    
    const [dbMessage] = await connection.query(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    if (dbMessage.length === 0) {
      await log('EndToEnd', 'Message not found in database', 'error');
      return false;
    }

    const msg = dbMessage[0];
    await log('EndToEnd', `✓ Message found in DB (is_group: ${msg.is_group}, is_read: ${msg.is_read})`, 'success');

    // Step 3: Verify recipients
    await log('EndToEnd', 'Step 3: Verifying message recipients...', 'info');
    
    const [recipients] = await connection.query(
      'SELECT * FROM message_recipients WHERE message_id = ?',
      [messageId]
    );

    if (recipients.length !== 2) {
      await log('EndToEnd', `Expected 2 recipients, found ${recipients.length}`, 'error');
      return false;
    }

    await log('EndToEnd', `✓ Found ${recipients.length} recipients in message_recipients table`, 'success');

    // Step 4: Verify notifications
    await log('EndToEnd', 'Step 4: Verifying notifications...', 'info');
    
    const [notifications] = await connection.query(
      'SELECT * FROM notifications WHERE notification_type = ? ORDER BY created_at DESC LIMIT 2',
      ['message']
    );

    if (notifications.length >= 2) {
      await log('EndToEnd', `✓ Found ${notifications.length} notifications created`, 'success');
    } else {
      await log('EndToEnd', `⚠️ Expected 2 notifications, found ${notifications.length}`, 'warning');
    }

    // Step 5: Receiver retrieves messages
    await log('EndToEnd', 'Step 5: Receiver retrieving messages...', 'info');
    
    const receiverMessages = await axios.get(`${API_BASE}/messages/user/${receiver1.id}?userId=${receiver1.id}`);
    
    if (receiverMessages.data.length > 0) {
      await log('EndToEnd', `✓ Receiver can see ${receiverMessages.data.length} messages`, 'success');
    } else {
      await log('EndToEnd', 'Receiver cannot see any messages', 'error');
      return false;
    }

    // Step 6: Mark message as read
    await log('EndToEnd', 'Step 6: Marking message as read...', 'info');
    
    try {
      await axios.put(`${API_BASE}/messages/read/${messageId}?userId=${receiver1.id}`);
      await log('EndToEnd', '✓ Message marked as read', 'success');
    } catch (error) {
      await log('EndToEnd', `⚠️ Mark as read failed: ${error.response?.data?.message || error.message}`, 'warning');
    }

    // Step 7: Verify read status in database
    await log('EndToEnd', 'Step 7: Verifying read status in database...', 'info');
    
    const [updatedMessage] = await connection.query(
      'SELECT is_read FROM messages WHERE id = ?',
      [messageId]
    );

    if (updatedMessage[0].is_read === 1) {
      await log('EndToEnd', '✓ Message read status updated in database', 'success');
    } else {
      await log('EndToEnd', '⚠️ Message read status not updated', 'warning');
    }

    return true;
  } catch (error) {
    await log('EndToEnd', `End-to-end test failed: ${error.message}`, 'error');
    return false;
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('MESSAGING SYSTEM VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');

  console.log('📊 TEST RESULTS SUMMARY:\n');

  for (const [section, results] of Object.entries(testResults)) {
    if (results.length === 0) continue;
    
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const warnings = results.filter(r => r.status === 'warning').length;

    console.log(`${section.toUpperCase()}: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFICATION COMPLETE');
  console.log('='.repeat(80) + '\n');
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('MESSAGING SYSTEM VERIFICATION SCRIPT');
  console.log('='.repeat(80) + '\n');

  // Connect to database
  if (!await connectDB()) {
    console.error('Failed to connect to database');
    process.exit(1);
  }

  // Verify database structure
  console.log('\n📋 VERIFYING DATABASE STRUCTURE...\n');
  await verifyTables();
  await verifyIndexes();

  // Check data integrity
  console.log('\n🔍 CHECKING DATA INTEGRITY...\n');
  await checkDataIntegrity();

  // Test API endpoints
  console.log('\n🌐 TESTING API ENDPOINTS...\n');
  await testAPIEndpoints();

  // Test end-to-end flow
  console.log('\n🔄 TESTING END-TO-END FLOW...\n');
  await testEndToEnd();

  // Generate report
  await generateReport();

  // Close connection
  if (connection) {
    await connection.end();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
