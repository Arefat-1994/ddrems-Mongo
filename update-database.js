const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function updateDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307,
    multipleStatements: true
  });

  console.log('Updating database schema...\n');

  try {
    const sqlFile = fs.readFileSync(path.join(__dirname, 'database', 'update-schema.sql'), 'utf8');
    
    await connection.query(sqlFile);
    
    console.log('✅ Database updated successfully!');
    console.log('\nNew features added:');
    console.log('- Announcements table created');
    console.log('- Sample announcements inserted');
    console.log('- Properties table updated with new fields');
    console.log('- Users and Brokers tables updated');
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
  } finally {
    await connection.end();
  }
}

updateDatabase();
