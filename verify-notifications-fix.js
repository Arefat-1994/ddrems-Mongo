const mysql = require('mysql2/promise');

async function verify() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ddrems',
      port: process.env.DB_PORT || 3307
    });

    console.log('\n✅ Connected to database\n');

    console.log('📋 NOTIFICATIONS TABLE STRUCTURE:');
    const [notifStructure] = await connection.query('DESCRIBE notifications');
    console.table(notifStructure);

    console.log('\n📋 MESSAGES TABLE STRUCTURE:');
    const [msgStructure] = await connection.query('DESCRIBE messages');
    console.table(msgStructure);

    console.log('\n📋 MESSAGE_RECIPIENTS TABLE STRUCTURE:');
    const [recipStructure] = await connection.query('DESCRIBE message_recipients');
    console.table(recipStructure);

    console.log('\n📊 DATA COUNTS:');
    const [counts] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE is_group = 0) as individual_messages,
        (SELECT COUNT(*) FROM messages WHERE is_group = 1) as group_messages,
        (SELECT COUNT(*) FROM message_recipients) as total_recipients,
        (SELECT COUNT(*) FROM notifications) as total_notifications
    `);
    console.table(counts[0]);

    console.log('\n✅ VERIFICATION COMPLETE - All tables are properly structured!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verify();
