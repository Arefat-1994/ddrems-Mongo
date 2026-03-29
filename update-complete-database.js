const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function updateCompleteDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307,
    multipleStatements: true
  });

  console.log('Updating database with complete schema...\n');

  try {
    const sqlFile = fs.readFileSync(path.join(__dirname, 'database', 'complete-schema.sql'), 'utf8');
    
    await connection.query(sqlFile);
    
    console.log('✅ Database updated successfully!');
    console.log('\nNew tables added:');
    console.log('- agreements');
    console.log('- favorites');
    console.log('- property_views');
    console.log('- feedback');
    console.log('- messages');
    console.log('- notifications');
    console.log('- system_config');
    console.log('- audit_log');
    console.log('- receipts');
    console.log('- property_documents');
    console.log('\nSample data inserted for all actors');
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
  } finally {
    await connection.end();
  }
}

updateCompleteDatabase();
