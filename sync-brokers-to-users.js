const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function syncBrokersToUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔄 Syncing brokers to users table...\n');

  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Get all brokers
    const [brokers] = await connection.query('SELECT * FROM brokers');
    
    console.log(`Found ${brokers.length} brokers to sync\n`);
    
    for (const broker of brokers) {
      // Check if broker already exists in users table
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [broker.email]
      );
      
      if (existingUsers.length > 0) {
        // Update existing user
        await connection.query(`
          UPDATE users 
          SET name = ?, role = 'broker', password = ?, phone = ?
          WHERE email = ?
        `, [broker.name, hashedPassword, broker.phone, broker.email]);
        
        console.log(`✅ Updated user: ${broker.name} (${broker.email})`);
      } else {
        // Insert new user
        const [result] = await connection.query(`
          INSERT INTO users (name, email, password, phone, role, status)
          VALUES (?, ?, ?, ?, 'broker', 'active')
        `, [broker.name, broker.email, hashedPassword, broker.phone]);
        
        console.log(`✅ Created user: ${broker.name} (${broker.email})`);
        
        // Update broker with user_id reference
        await connection.query(`
          UPDATE brokers SET user_id = ? WHERE id = ?
        `, [result.insertId, broker.id]);
      }
    }
    
    console.log('\n🎉 Broker sync completed successfully!');
    console.log('\n📋 Broker Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    brokers.forEach(broker => {
      console.log(`${broker.name}: ${broker.email} / admin123`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Verify users table
    const [users] = await connection.query(`
      SELECT id, name, email, role FROM users WHERE role = 'broker'
    `);
    console.log(`\n✅ Total broker users in users table: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

syncBrokersToUsers();
