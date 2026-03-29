const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixBrokerUserSync() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔧 Fixing broker-user synchronization...\n');

  try {
    // Step 1: Add user_id column to brokers table if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE brokers 
        ADD COLUMN user_id INT AFTER id,
        ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✅ Added user_id column to brokers table');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  user_id column already exists');
      } else {
        console.log('ℹ️  Skipping user_id column (may already exist)');
      }
    }
    
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Step 2: Get all brokers
    const [brokers] = await connection.query('SELECT * FROM brokers');
    
    console.log(`\nFound ${brokers.length} brokers to sync\n`);
    
    for (const broker of brokers) {
      // Check if broker already exists in users table
      const [existingUsers] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [broker.email]
      );
      
      let userId;
      
      if (existingUsers.length > 0) {
        // Update existing user
        userId = existingUsers[0].id;
        await connection.query(`
          UPDATE users 
          SET name = ?, role = 'broker', password = ?, phone = ?, status = 'active'
          WHERE email = ?
        `, [broker.name, hashedPassword, broker.phone, broker.email]);
        
        console.log(`✅ Updated user: ${broker.name} (${broker.email})`);
      } else {
        // Insert new user
        const [result] = await connection.query(`
          INSERT INTO users (name, email, password, phone, role, status)
          VALUES (?, ?, ?, ?, 'broker', 'active')
        `, [broker.name, broker.email, hashedPassword, broker.phone]);
        
        userId = result.insertId;
        console.log(`✅ Created user: ${broker.name} (${broker.email})`);
      }
      
      // Update broker with user_id reference
      await connection.query(`
        UPDATE brokers SET user_id = ? WHERE id = ?
      `, [userId, broker.id]);
    }
    
    console.log('\n🎉 Broker-User sync completed successfully!');
    
    // Verify the sync
    const [brokerUsers] = await connection.query(`
      SELECT u.id, u.name, u.email, u.role, b.license_number, b.commission_rate
      FROM users u
      LEFT JOIN brokers b ON u.id = b.user_id
      WHERE u.role = 'broker'
    `);
    
    console.log('\n📋 Broker Accounts (can now login):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    brokerUsers.forEach(user => {
      console.log(`${user.name}: ${user.email} / admin123`);
      console.log(`   License: ${user.license_number}, Commission: ${user.commission_rate}%`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log(`\n✅ Total broker users: ${brokerUsers.length}`);
    console.log('✅ All brokers can now login with their email and password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixBrokerUserSync();
