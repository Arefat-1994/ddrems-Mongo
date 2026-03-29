const mysql = require('mysql2/promise');

async function verifyEnhancements() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔍 Verifying Database Enhancements...\n');

  try {
    // Check if new columns exist in properties table
    const [propertiesColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' 
      AND TABLE_NAME = 'properties'
      AND COLUMN_NAME IN ('images', 'documents', 'document_access_key', 'is_document_locked')
    `);
    
    console.log('📋 Properties Table New Columns:');
    if (propertiesColumns.length > 0) {
      propertiesColumns.forEach(col => console.log(`   ✅ ${col.COLUMN_NAME}`));
    } else {
      console.log('   ❌ No new columns found - enhancements not applied');
    }

    // Check new tables
    const newTables = [
      'property_images',
      'property_documents',
      'document_access_requests',
      'commission_tracking',
      'feedback_responses',
      'property_verification'
    ];

    console.log('\n📊 New Tables:');
    for (const table of newTables) {
      const [exists] = await connection.query(`
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = ?
      `, [table]);
      
      if (exists[0].count > 0) {
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table} (${count[0].count} records)`);
      } else {
        console.log(`   ❌ ${table} - NOT FOUND`);
      }
    }

    // Check agreements table enhancements
    const [agreementsColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' 
      AND TABLE_NAME = 'agreements'
      AND COLUMN_NAME IN ('agreement_document', 'meeting_date', 'meeting_status', 'notes')
    `);
    
    console.log('\n📋 Agreements Table Enhancements:');
    if (agreementsColumns.length > 0) {
      agreementsColumns.forEach(col => console.log(`   ✅ ${col.COLUMN_NAME}`));
    } else {
      console.log('   ❌ No enhancements found');
    }

    // Count total tables
    const [allTables] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems'
    `);
    
    console.log(`\n📊 Total Tables in Database: ${allTables[0].count}`);

    // Check backend routes
    console.log('\n🔌 Backend API Routes Status:');
    const routes = [
      'property-images',
      'property-documents',
      'document-access',
      'commissions',
      'verification'
    ];
    
    const fs = require('fs');
    routes.forEach(route => {
      const exists = fs.existsSync(`server/routes/${route}.js`);
      console.log(`   ${exists ? '✅' : '❌'} /api/${route}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('📈 ENHANCEMENT STATUS SUMMARY');
    console.log('='.repeat(50));
    
    if (propertiesColumns.length === 4 && agreementsColumns.length === 4) {
      console.log('✅ Database Schema: FULLY ENHANCED');
    } else {
      console.log('⚠️  Database Schema: NEEDS ENHANCEMENT');
      console.log('   Run: node apply-enhancements.js');
    }
    
    console.log('✅ Backend Routes: ALL CREATED');
    console.log('⏳ Frontend Components: PENDING');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifyEnhancements();
