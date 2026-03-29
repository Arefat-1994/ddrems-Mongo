const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ddrems',
  port: 3307
};

async function cleanTestMessages() {
  let connection;
  
  try {
    console.log('🧹 Cleaning test messages from database...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Delete test messages (messages with test-related subjects)
    const [deleteResult] = await connection.execute(`
      DELETE FROM messages 
      WHERE subject LIKE '%test%' 
         OR subject LIKE '%Test%' 
         OR subject LIKE '%TEST%'
         OR message LIKE '%test%'
         OR message LIKE '%Test%'
         OR message LIKE '%TEST%'
    `);
    
    console.log(`✅ Deleted ${deleteResult.affectedRows} test messages`);
    
    // Clean up orphaned message recipients
    const [recipientsResult] = await connection.execute(`
      DELETE mr FROM message_recipients mr
      LEFT JOIN messages m ON mr.message_id = m.id
      WHERE m.id IS NULL
    `);
    
    console.log(`✅ Cleaned up ${recipientsResult.affectedRows} orphaned message recipients`);
    
    // Clean up orphaned notifications
    const [notificationsResult] = await connection.execute(`
      DELETE FROM notifications 
      WHERE title LIKE '%test%' 
         OR title LIKE '%Test%' 
         OR title LIKE '%TEST%'
         OR message LIKE '%test%'
         OR message LIKE '%Test%'
         OR message LIKE '%TEST%'
    `);
    
    console.log(`✅ Cleaned up ${notificationsResult.affectedRows} test notifications`);
    
    // Show remaining message count
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM messages');
    console.log(`📊 Remaining messages in database: ${countResult[0].count}`);
    
    console.log('\n🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run cleanup
cleanTestMessages();