const mysql = require('mysql2/promise');

async function checkSchema() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ddrems',
      port: 3307
    });

    console.log('Users table structure:');
    const [usersSchema] = await conn.execute('DESCRIBE users');
    console.log(JSON.stringify(usersSchema, null, 2));

    console.log('\nBroker profiles table structure:');
    const [brokerSchema] = await conn.execute('DESCRIBE broker_profiles');
    console.log(JSON.stringify(brokerSchema, null, 2));

    conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSchema();