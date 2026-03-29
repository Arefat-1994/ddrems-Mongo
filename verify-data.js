const mysql = require('mysql2/promise');

async function verifyData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔍 Verifying DDREMS Database Data...\n');

  try {
    // Check users
    const [users] = await connection.query('SELECT id, name, email, role, status FROM users');
    console.log('👥 Users:', users.length);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role} - Status: ${user.status}`);
    });
    console.log('');

    // Check properties
    const [properties] = await connection.query('SELECT id, title, type, status, price FROM properties LIMIT 5');
    console.log('🏠 Properties:', properties.length);
    properties.forEach(prop => {
      console.log(`   - ${prop.title} (${prop.type}) - ${(prop.price / 1000000).toFixed(2)}M ETB - Status: ${prop.status}`);
    });
    console.log('');

    // Check brokers
    const [brokers] = await connection.query('SELECT id, name, email, status FROM brokers');
    console.log('👔 Brokers:', brokers.length);
    brokers.forEach(broker => {
      console.log(`   - ${broker.name} (${broker.email}) - Status: ${broker.status}`);
    });
    console.log('');

    // Check transactions
    const [transactions] = await connection.query('SELECT COUNT(*) as count FROM transactions');
    console.log('💰 Transactions:', transactions[0].count);
    console.log('');

    // Check announcements
    const [announcements] = await connection.query('SELECT COUNT(*) as count FROM announcements');
    console.log('📢 Announcements:', announcements[0].count);
    console.log('');

    console.log('✅ Data verification complete!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Properties: ${properties.length}`);
    console.log(`   Brokers: ${brokers.length}`);
    console.log(`   Transactions: ${transactions[0].count}`);
    console.log(`   Announcements: ${announcements[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyData();
