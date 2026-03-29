const mysql = require('mysql2/promise');

// Database configuration from .env
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ddrems',
  port: 3307
};

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...');
  console.log('================================');
  
  try {
    console.log('📋 Configuration:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log('');

    // Test connection
    console.log('🔌 Attempting to connect...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connection successful!');
    
    // Test database exists
    console.log('🗄️  Testing database access...');
    const [databases] = await connection.execute('SHOW DATABASES');
    const dbExists = databases.some(db => db.Database === dbConfig.database);
    
    if (dbExists) {
      console.log(`✅ Database '${dbConfig.database}' exists`);
      
      // Test tables
      console.log('📊 Checking tables...');
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach(table => {
        console.log(`   - ${Object.values(table)[0]}`);
      });
      
      // Test messages table specifically
      try {
        const [messageCount] = await connection.execute('SELECT COUNT(*) as count FROM messages');
        console.log(`✅ Messages table: ${messageCount[0].count} records`);
      } catch (error) {
        console.log('❌ Messages table not accessible:', error.message);
      }
      
    } else {
      console.log(`❌ Database '${dbConfig.database}' does not exist`);
      console.log('💡 Available databases:');
      databases.forEach(db => {
        console.log(`   - ${db.Database}`);
      });
    }
    
    await connection.end();
    console.log('');
    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('');
    console.log('🔍 Error Details:');
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    console.log('');
    
    console.log('💡 Possible Solutions:');
    if (error.code === 'ECONNREFUSED') {
      console.log('   1. Start XAMPP MySQL service');
      console.log('   2. Check if MySQL is running on port 3307');
      console.log('   3. Verify XAMPP Control Panel shows MySQL as running');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   1. Check database username and password');
      console.log('   2. Verify user has proper permissions');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('   1. Create the database: CREATE DATABASE ddrems;');
      console.log('   2. Import the database schema');
    }
    
    console.log('');
    console.log('🛠️  Quick Fixes:');
    console.log('   - Run: fix-xampp-connection.bat');
    console.log('   - Restart XAMPP as Administrator');
    console.log('   - Check Windows Firewall settings');
  }
}

// Run the test
testDatabaseConnection();