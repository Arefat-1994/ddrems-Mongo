// Add missing users to DDREMS system
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function addMissingUsers() {
  console.log('🔧 Adding missing users to DDREMS...\n');
  
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3307,
      database: process.env.DB_NAME || 'ddrems'
    });
    
    console.log('✅ Connected to database\n');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Users to add
    const usersToAdd = [
      {
        name: 'Broker User',
        email: 'broker@ddrems.com',
        password: hashedPassword,
        role: 'broker',
        phone: '555-0003'
      },
      {
        name: 'System Admin',
        email: 'systemadmin@ddrems.com',
        password: hashedPassword,
        role: 'system_admin',
        phone: '555-0006'
      }
    ];
    
    for (const user of usersToAdd) {
      try {
        // Check if user already exists
        const [existing] = await connection.query(
          'SELECT id FROM users WHERE email = ?',
          [user.email]
        );
        
        if (existing.length > 0) {
          console.log(`⚠️  ${user.email} already exists (ID: ${existing[0].id})`);
          continue;
        }
        
        // Insert user
        const [result] = await connection.query(
          `INSERT INTO users (name, email, password, role, phone) 
           VALUES (?, ?, ?, ?, ?)`,
          [user.name, user.email, user.password, user.role, user.phone]
        );
        
        console.log(`✅ Added ${user.email} (${user.role}) - ID: ${result.insertId}`);
        
        // If broker, also add to brokers table
        if (user.role === 'broker') {
          const [brokerExists] = await connection.query(
            'SELECT id FROM brokers WHERE email = ?',
            [user.email]
          );
          
          if (brokerExists.length === 0) {
            await connection.query(
              `INSERT INTO brokers (name, email, phone, license_number, commission_rate) 
               VALUES (?, ?, ?, ?, ?)`,
              [user.name, user.email, user.phone, 'LIC-' + Date.now(), 5.0]
            );
            console.log(`   ✅ Added to brokers table`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error adding ${user.email}:`, error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Show all users
    const [allUsers] = await connection.query(
      'SELECT id, name, email, role FROM users ORDER BY role, email'
    );
    
    console.log('\nAll users in system:');
    for (const user of allUsers) {
      console.log(`  ${user.id}. ${user.email.padEnd(35)} (${user.role})`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ All missing users have been added!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nTest Accounts (all passwords: admin123):');
    console.log('  • admin@ddrems.com          (admin)');
    console.log('  • owner@ddrems.com          (owner)');
    console.log('  • customer@ddrems.com       (user)');
    console.log('  • broker@ddrems.com         (broker)');
    console.log('  • propertyadmin@ddrems.com  (property_admin)');
    console.log('  • systemadmin@ddrems.com    (system_admin)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure WAMP server is running');
    console.log('   2. Check database exists: ddrems');
    console.log('   3. Verify .env file settings');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addMissingUsers();
