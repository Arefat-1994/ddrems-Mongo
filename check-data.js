const mysql = require('mysql2/promise');

async function checkData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('Checking database data...\n');

  try {
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log('👤 Users:', users[0].count);

    const [brokers] = await connection.query('SELECT COUNT(*) as count FROM brokers');
    console.log('👥 Brokers:', brokers[0].count);

    const [properties] = await connection.query('SELECT COUNT(*) as count FROM properties');
    console.log('🏠 Properties:', properties[0].count);

    const [transactions] = await connection.query('SELECT COUNT(*) as count FROM transactions');
    console.log('💰 Transactions:', transactions[0].count);

    console.log('\n✅ Database has data!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkData();
