const mysql = require('mysql2/promise');

async function checkStats() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ddrems',
      port: 3307
    });

    const [brokerRows] = await conn.execute('SELECT COUNT(*) as broker_count FROM users WHERE role = "broker"');
    console.log('Total brokers:', brokerRows[0].broker_count);

    const [profileRows] = await conn.execute('SELECT COUNT(*) as profiles_count FROM broker_profiles WHERE profile_photo IS NOT NULL');
    console.log('Profiles with photos:', profileRows[0].profiles_count);

    const [idDocRows] = await conn.execute('SELECT COUNT(*) as id_docs_count FROM broker_profiles WHERE id_document IS NOT NULL');
    console.log('Profiles with ID documents:', idDocRows[0].id_docs_count);

    const [licenseRows] = await conn.execute('SELECT COUNT(*) as licenses_count FROM broker_profiles WHERE broker_license IS NOT NULL');
    console.log('Profiles with licenses:', licenseRows[0].licenses_count);

    conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStats();