const mysql = require('mysql2/promise');
const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ddrems'
};

async function run() {
  const connection = await mysql.createConnection(config);
  try {
    console.log('Updating users table role ENUM...');
    await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') 
      DEFAULT 'user'
    `);
    console.log('✅ Successfully updated users table schema');
    
    // Also check if any other tables need updates (e.g. profiles)
    // The profiles are already separate tables, so they are fine.
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
  } finally {
    await connection.end();
  }
}

run();
