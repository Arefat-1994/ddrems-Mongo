const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function setupBrokerAuth() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔧 Setting up broker authentication...\n');

  try {
    // Add password column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE brokers ADD COLUMN password VARCHAR(255) AFTER email
      `);
      console.log('✅ Added password column to brokers table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Password column already exists');
      } else {
        throw error;
      }
    }
    
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update all brokers with password
    await connection.query(`
      UPDATE brokers SET password = ?
    `, [hashedPassword]);
    
    console.log('✅ Updated all broker passwords');
    
    // Get broker list
    const [brokers] = await connection.query('SELECT id, name, email FROM brokers');
    
    console.log('\n🎉 Broker authentication setup complete!');
    console.log('\n📋 Broker Credentials (all use password: admin123):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    brokers.forEach(broker => {
      console.log(`${broker.name}: ${broker.email}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

setupBrokerAuth();
