const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function updateBrokerPasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔐 Updating broker passwords...\n');

  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update broker 1
    await connection.query(
      'UPDATE brokers SET password = ? WHERE email = ?',
      [hashedPassword, 'john@ddrems.com']
    );
    console.log('✅ Updated: john@ddrems.com / admin123');
    
    // Update broker 2
    await connection.query(
      'UPDATE brokers SET password = ? WHERE email = ?',
      [hashedPassword, 'jane@ddrems.com']
    );
    console.log('✅ Updated: jane@ddrems.com / admin123');
    
    // Update broker 3
    await connection.query(
      'UPDATE brokers SET password = ? WHERE email = ?',
      [hashedPassword, 'ahmed@ddrems.com']
    );
    console.log('✅ Updated: ahmed@ddrems.com / admin123');
    
    console.log('\n🎉 All broker passwords updated successfully!');
    console.log('\nBroker Credentials (all use password: admin123):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Agent 1: john@ddrems.com');
    console.log('Agent 2: jane@ddrems.com');
    console.log('Agent 3: ahmed@ddrems.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

updateBrokerPasswords();
