const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applyFix() {
  let connection;
  try {
    console.log('[STEP 1] Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ddrems',
      port: process.env.DB_PORT || 3307,
      multipleStatements: true
    });
    console.log('✅ Connected to database');

    console.log('\n[STEP 2] Backing up existing notifications...');
    const [backupCheck] = await connection.query(
      'SELECT COUNT(*) as count FROM notifications'
    );
    console.log(`✅ Found ${backupCheck[0].count} existing notifications`);

    console.log('\n[STEP 3] Creating backup table...');
    await connection.query('CREATE TABLE IF NOT EXISTS notifications_backup AS SELECT * FROM notifications');
    console.log('✅ Backup created');

    console.log('\n[STEP 4] Dropping old notifications table...');
    await connection.query('DROP TABLE IF EXISTS notifications');
    console.log('✅ Old table dropped');

    console.log('\n[STEP 5] Creating new notifications table...');
    await connection.query(`
      CREATE TABLE notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info', 'success', 'warning', 'error', 'request') DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(500),
        action_url VARCHAR(255),
        related_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_created (created_at),
        INDEX idx_is_read (is_read)
      )
    `);
    console.log('✅ New notifications table created');

    console.log('\n[STEP 6] Restoring data from backup...');
    await connection.query(`
      INSERT INTO notifications (user_id, title, message, type, is_read, link, action_url, related_id, created_at)
      SELECT user_id, title, message, type, is_read, link, action_url, related_id, created_at
      FROM notifications_backup
      WHERE user_id IS NOT NULL
    `);
    const [restoreCheck] = await connection.query('SELECT COUNT(*) as count FROM notifications');
    console.log(`✅ Restored ${restoreCheck[0].count} notifications`);

    console.log('\n[STEP 7] Verifying messages table...');
    await connection.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'general' AFTER message,
      ADD COLUMN IF NOT EXISTS status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent' AFTER message_type,
      ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE AFTER is_read,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL AFTER is_group
    `);
    console.log('✅ Messages table verified');

    console.log('\n[STEP 8] Adding indexes to messages table...');
    await connection.query(`
      ALTER TABLE messages 
      ADD INDEX IF NOT EXISTS idx_receiver (receiver_id),
      ADD INDEX IF NOT EXISTS idx_sender (sender_id),
      ADD INDEX IF NOT EXISTS idx_created (created_at),
      ADD INDEX IF NOT EXISTS idx_is_group (is_group)
    `);
    console.log('✅ Indexes added');

    console.log('\n[STEP 9] Verifying message_recipients table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS message_recipients (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        user_id INT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_message (message_id),
        INDEX idx_user (user_id),
        UNIQUE KEY unique_recipient (message_id, user_id)
      )
    `);
    console.log('✅ Message_recipients table verified');

    console.log('\n[STEP 10] Final verification...');
    const [msgCount] = await connection.query('SELECT COUNT(*) as count FROM messages');
    const [recipCount] = await connection.query('SELECT COUNT(*) as count FROM message_recipients');
    const [notifCount] = await connection.query('SELECT COUNT(*) as count FROM notifications');
    
    console.log(`\n📊 DATA SUMMARY:`);
    console.log(`   - Total messages: ${msgCount[0].count}`);
    console.log(`   - Total message recipients: ${recipCount[0].count}`);
    console.log(`   - Total notifications: ${notifCount[0].count}`);

    console.log('\n✅ ALL FIXES APPLIED SUCCESSFULLY!');
    console.log('\n🚀 You can now restart the server and messages should work correctly.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applyFix();
