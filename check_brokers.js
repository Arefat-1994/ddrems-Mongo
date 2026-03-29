const mysql = require('mysql2/promise');

async function checkBrokers() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ddrems',
      port: 3307
    });

    const [rows] = await conn.execute(
      'SELECT u.id, u.name, u.email, u.role, bp.profile_photo, bp.id_document, bp.broker_license FROM users u LEFT JOIN broker_profiles bp ON u.id = bp.user_id WHERE u.role = "broker" LIMIT 5'
    );

    console.log('Broker data with profile images:');
    console.log(JSON.stringify(rows, null, 2));

    conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBrokers();