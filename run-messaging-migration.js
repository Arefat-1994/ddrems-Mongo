const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ddrems'
    });

    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrate-messaging-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }

    console.log('✅ Messaging system migration completed successfully!');
    console.log('\n📋 Changes made:');
    console.log('  ✓ Added is_group column to messages table');
    console.log('  ✓ Made receiver_id nullable for group messages');
    console.log('  ✓ Created message_recipients table for group messaging');
    console.log('\n🚀 The messaging system now supports:');
    console.log('  • Single user messages');
    console.log('  • Group messages');
    console.log('  • Bulk messages by role (admin/property_admin only)');
    console.log('  • Role-based access control');
    console.log('  • Proper authentication and authorization');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
