const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('Setting up admin user...\n');

  try {
    // Hash the password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update admin user
    await connection.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@ddrems.com']
    );

    console.log('✅ Admin user updated successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@ddrems.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

setupAdmin();
