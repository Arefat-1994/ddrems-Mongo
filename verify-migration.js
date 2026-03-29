const mysql = require('mysql2/promise');

async function verify() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables:', tableNames.join(', '));
    
    if (tableNames.includes('key_requests')) {
      console.log('✅ key_requests table EXISTS');
    } else {
      console.log('❌ key_requests table MISSING');
    }

    const [columns] = await connection.query('DESCRIBE agreement_requests');
    if (columns.some(c => c.Field === 'admin_id')) {
        console.log('✅ agreement_requests.admin_id EXISTS');
    } else {
        console.log('❌ agreement_requests.admin_id MISSING');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

verify();
