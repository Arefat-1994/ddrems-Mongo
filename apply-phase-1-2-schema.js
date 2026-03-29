const mysql = require('mysql2/promise');

async function applySchema() {
  let connection;
  try {
    console.log('[PHASE 1 & 2] Applying schema changes...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ddrems',
      port: process.env.DB_PORT || 3307,
      multipleStatements: true
    });

    console.log('✅ Connected to database\n');

    // Create message_replies table
    console.log('[STEP 1] Creating message_replies table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS message_replies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        parent_message_id INT NOT NULL,
        reply_message_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_message_id) REFERENCES messages(id) ON DELETE CASCADE,
        INDEX idx_parent (parent_message_id),
        INDEX idx_reply (reply_message_id),
        UNIQUE KEY unique_reply (parent_message_id, reply_message_id)
      )
    `);
    console.log('✅ message_replies table created\n');

    // Add parent_id and reply_count to messages table
    console.log('[STEP 2] Updating messages table...');
    await connection.query(`
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS parent_id INT AFTER receiver_id,
      ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0 AFTER is_group
    `);
    console.log('✅ messages table updated\n');

    // Add foreign key for parent_id
    console.log('[STEP 3] Adding foreign key constraint...');
    try {
      await connection.query(`
        ALTER TABLE messages 
        ADD FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE
      `);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') {
        throw err;
      }
    }
    console.log('✅ Foreign key added\n');

    // Create indexes
    console.log('[STEP 4] Creating indexes...');
    await connection.query(`
      ALTER TABLE messages 
      ADD INDEX IF NOT EXISTS idx_parent_id (parent_id),
      ADD INDEX IF NOT EXISTS idx_reply_count (reply_count)
    `);
    console.log('✅ Indexes created\n');

    // Verify structures
    console.log('[STEP 5] Verifying table structures...');
    const [msgCols] = await connection.query('DESCRIBE messages');
    const [replyCols] = await connection.query('DESCRIBE message_replies');
    
    console.log('Messages table columns:');
    msgCols.forEach(col => {
      if (['parent_id', 'reply_count'].includes(col.Field)) {
        console.log(`  ✅ ${col.Field}: ${col.Type}`);
      }
    });
    
    console.log('\nMessage_replies table columns:');
    replyCols.forEach(col => {
      console.log(`  ✅ ${col.Field}: ${col.Type}`);
    });

    console.log('\n✅ PHASE 1 & 2 SCHEMA SETUP COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Update backend endpoints in server/routes/messages.js');
    console.log('2. Update frontend components');
    console.log('3. Test reply functionality');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applySchema();
