const mysql = require('mysql2/promise');

async function checkTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔍 Checking database structure...\n');

  try {
    // Check users table structure
    const [usersColumns] = await connection.query('DESCRIBE users');
    console.log('📋 USERS TABLE COLUMNS:');
    usersColumns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Check brokers table structure
    const [brokersColumns] = await connection.query('DESCRIBE brokers');
    console.log('📋 BROKERS TABLE COLUMNS:');
    brokersColumns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Check current users
    const [users] = await connection.query('SELECT id, name, email, role FROM users');
    console.log('👥 CURRENT USERS:');
    users.forEach(user => {
      console.log(`   ${user.id}. ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    console.log('');

    // Check current brokers
    const [brokers] = await connection.query('SELECT id, name, email, license_number FROM brokers');
    console.log('👔 CURRENT BROKERS:');
    brokers.forEach(broker => {
      console.log(`   ${broker.id}. ${broker.name} (${broker.email}) - License: ${broker.license_number}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTables();
