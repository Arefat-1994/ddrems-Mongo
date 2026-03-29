const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('Creating test users for all roles...\n');

  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update existing admin
    await connection.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@ddrems.com']
    );
    console.log('✅ Admin user updated: admin@ddrems.com / admin123');
    
    // Create owner user
    await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['Property Owner', 'owner@ddrems.com', hashedPassword, '+251944123456', 'owner', 'active', hashedPassword]
    );
    console.log('✅ Owner user created: owner@ddrems.com / admin123');
    
    // Create customer user
    await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['Customer User', 'customer@ddrems.com', hashedPassword, '+251955234567', 'user', 'active', hashedPassword]
    );
    console.log('✅ Customer user created: customer@ddrems.com / admin123');
    
    // Create property admin user
    await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['Property Admin', 'propertyadmin@ddrems.com', hashedPassword, '+251966345678', 'property_admin', 'active', hashedPassword]
    );
    console.log('✅ Property Admin user created: propertyadmin@ddrems.com / admin123');
    
    // Create system admin user
    await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE password = ?',
      ['System Admin', 'sysadmin@ddrems.com', hashedPassword, '+251977456789', 'system_admin', 'active', hashedPassword]
    );
    console.log('✅ System Admin user created: sysadmin@ddrems.com / admin123');
    
    console.log('\n🎉 All test users created successfully!');
    console.log('\nTest Credentials (all use password: admin123):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:          admin@ddrems.com');
    console.log('Owner:          owner@ddrems.com');
    console.log('Customer:       customer@ddrems.com');
    console.log('Property Admin: propertyadmin@ddrems.com');
    console.log('System Admin:   sysadmin@ddrems.com');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await connection.end();
  }
}

createTestUsers();
