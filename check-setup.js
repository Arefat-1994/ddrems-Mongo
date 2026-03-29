// Check if DDREMS setup is correct
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function checkSetup() {
  console.log('🔍 Checking DDREMS Setup...\n');
  
  let connection;
  
  try {
    // 1. Check database connection
    console.log('1️⃣ Testing database connection...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3307,
      database: process.env.DB_NAME || 'ddrems'
    });
    console.log('   ✅ Database connection successful!\n');
    
    // 2. Check required tables
    console.log('2️⃣ Checking required tables...');
    const requiredTables = [
      'users',
      'properties',
      'property_images',
      'property_documents',
      'brokers',
      'transactions',
      'announcements',
      'agreements',
      'favorites',
      'notifications',
      'messages'
    ];
    
    const [tables] = await connection.query('SHOW TABLES');
    const existingTables = tables.map(t => Object.values(t)[0]);
    
    let allTablesExist = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} - MISSING!`);
        allTablesExist = false;
      }
    }
    console.log('');
    
    // 3. Check property_images structure
    console.log('3️⃣ Checking property_images table structure...');
    const [columns] = await connection.query('DESCRIBE property_images');
    const imageUrlColumn = columns.find(c => c.Field === 'image_url');
    
    if (imageUrlColumn) {
      if (imageUrlColumn.Type.includes('longtext')) {
        console.log('   ✅ image_url is LONGTEXT (can store base64 images)');
      } else {
        console.log(`   ⚠️  image_url is ${imageUrlColumn.Type} (should be LONGTEXT)`);
        console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-image-upload.sql');
      }
    } else {
      console.log('   ❌ image_url column not found!');
    }
    console.log('');
    
    // 4. Check if properties has main_image column
    console.log('4️⃣ Checking properties table for main_image column...');
    const [propColumns] = await connection.query('DESCRIBE properties');
    const mainImageColumn = propColumns.find(c => c.Field === 'main_image');
    
    if (mainImageColumn) {
      console.log('   ✅ main_image column exists');
    } else {
      console.log('   ❌ main_image column missing!');
      console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-image-upload.sql');
    }
    console.log('');
    
    // 5. Check property_documents structure
    console.log('5️⃣ Checking property_documents table structure...');
    try {
      const [docColumns] = await connection.query('DESCRIBE property_documents');
      const documentUrlColumn = docColumns.find(c => c.Field === 'document_url');
      const accessKeyColumn = docColumns.find(c => c.Field === 'access_key');
      const isLockedColumn = docColumns.find(c => c.Field === 'is_locked');
      
      if (documentUrlColumn && documentUrlColumn.Type.includes('longtext')) {
        console.log('   ✅ document_url is LONGTEXT (can store base64 documents)');
      } else if (documentUrlColumn) {
        console.log(`   ⚠️  document_url is ${documentUrlColumn.Type} (should be LONGTEXT)`);
        console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-document-upload.sql');
      } else {
        console.log('   ❌ document_url column not found! (has document_path instead?)');
        console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-document-upload.sql');
      }
      
      if (accessKeyColumn) {
        console.log('   ✅ access_key column exists');
      } else {
        console.log('   ❌ access_key column missing!');
        console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-document-upload.sql');
      }
      
      if (isLockedColumn) {
        console.log('   ✅ is_locked column exists');
      } else {
        console.log('   ❌ is_locked column missing!');
        console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-document-upload.sql');
      }
    } catch (error) {
      console.log('   ❌ property_documents table not found!');
      console.log('   💡 Run: mysql -u root -p -P 3307 ddrems < fix-document-upload.sql');
    }
    console.log('');
    
    // 6. Check test users
    console.log('6️⃣ Checking test users...');
    const [users] = await connection.query('SELECT email, role FROM users');
    
    const requiredUsers = [
      { email: 'admin@ddrems.com', role: 'admin' },
      { email: 'owner@ddrems.com', role: 'owner' },
      { email: 'customer@ddrems.com', role: 'user' },
      { email: 'propertyadmin@ddrems.com', role: 'property_admin' },
      { email: 'systemadmin@ddrems.com', role: 'system_admin' },
      { email: 'broker@ddrems.com', role: 'broker' }
    ];
    
    for (const reqUser of requiredUsers) {
      const exists = users.find(u => u.email === reqUser.email && u.role === reqUser.role);
      if (exists) {
        console.log(`   ✅ ${reqUser.email} (${reqUser.role})`);
      } else {
        console.log(`   ❌ ${reqUser.email} (${reqUser.role}) - MISSING!`);
        console.log('   💡 Run: node create-test-users.js');
      }
    }
    console.log('');
    
    // 7. Summary
    console.log('📊 Setup Summary:');
    console.log('=====================================');
    if (allTablesExist && imageUrlColumn && imageUrlColumn.Type.includes('longtext') && mainImageColumn) {
      console.log('✅ All checks passed! System is ready.');
      console.log('\n🚀 Start servers with: restart-servers.bat');
      console.log('🌐 Access at: http://localhost:3000');
    } else {
      console.log('⚠️  Some issues found. Please fix them:');
      if (!allTablesExist) {
        console.log('   • Run database schema: mysql -u root -p -P 3307 ddrems < database/complete-schema.sql');
      }
      if (!imageUrlColumn || !imageUrlColumn.Type.includes('longtext') || !mainImageColumn) {
        console.log('   • Run image fix: mysql -u root -p -P 3307 ddrems < fix-image-upload.sql');
      }
    }
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure WAMP server is running');
    console.log('   2. Check database exists: ddrems');
    console.log('   3. Verify .env file settings:');
    console.log('      DB_HOST=localhost');
    console.log('      DB_PORT=3307');
    console.log('      DB_NAME=ddrems');
    console.log('      DB_USER=root');
    console.log('      DB_PASSWORD=');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSetup();
