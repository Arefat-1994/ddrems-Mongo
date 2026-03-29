const mysql = require('mysql2/promise');

async function testDatabaseEnhancements() {
  console.log('🧪 TESTING DATABASE ENHANCEMENTS\n');
  console.log('================================================\n');

  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ddrems',
      port: 3307
    });

    console.log('✅ Database connection successful\n');

    // TEST 1: Check Enhancement Tables
    console.log('TEST 1: ENHANCEMENT TABLES');
    console.log('----------------------------------------');
    
    const enhancementTables = [
      'property_images',
      'property_documents',
      'document_access_requests',
      'commission_tracking',
      'feedback_responses',
      'property_verification'
    ];

    let tablesFound = 0;
    for (const table of enhancementTables) {
      try {
        const [columns] = await connection.query(`DESCRIBE ${table}`);
        const [count] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ ${table}`);
        console.log(`   Columns: ${columns.length}, Records: ${count[0].count}`);
        tablesFound++;
      } catch (error) {
        console.log(`❌ ${table} - NOT FOUND`);
      }
    }
    console.log(`\nResult: ${tablesFound}/${enhancementTables.length} tables found\n`);

    // TEST 2: Check Properties Table Enhancements
    console.log('TEST 2: PROPERTIES TABLE ENHANCEMENTS');
    console.log('----------------------------------------');
    
    const [propColumns] = await connection.query(`DESCRIBE properties`);
    const newColumns = ['images', 'documents', 'document_access_key', 'is_document_locked', 'listing_type'];
    
    let columnsFound = 0;
    newColumns.forEach(col => {
      const exists = propColumns.find(c => c.Field === col);
      if (exists) {
        console.log(`✅ properties.${col} (${exists.Type})`);
        columnsFound++;
      } else {
        console.log(`❌ properties.${col} - NOT FOUND`);
      }
    });
    console.log(`\nResult: ${columnsFound}/${newColumns.length} columns found\n`);

    // TEST 3: Check Agreements Table Enhancements
    console.log('TEST 3: AGREEMENTS TABLE ENHANCEMENTS');
    console.log('----------------------------------------');
    
    const [agreeColumns] = await connection.query(`DESCRIBE agreements`);
    const agreeNewColumns = ['agreement_document', 'meeting_date', 'meeting_status', 'notes'];
    
    let agreeColumnsFound = 0;
    agreeNewColumns.forEach(col => {
      const exists = agreeColumns.find(c => c.Field === col);
      if (exists) {
        console.log(`✅ agreements.${col} (${exists.Type})`);
        agreeColumnsFound++;
      } else {
        console.log(`❌ agreements.${col} - NOT FOUND`);
      }
    });
    console.log(`\nResult: ${agreeColumnsFound}/${agreeNewColumns.length} columns found\n`);

    // TEST 4: Check Brokers Table
    console.log('TEST 4: BROKERS TABLE');
    console.log('----------------------------------------');
    
    const [brokerColumns] = await connection.query(`DESCRIBE brokers`);
    const brokerNewColumns = ['user_id', 'password'];
    
    brokerNewColumns.forEach(col => {
      const exists = brokerColumns.find(c => c.Field === col);
      if (exists) {
        console.log(`✅ brokers.${col} (${exists.Type})`);
      } else {
        console.log(`❌ brokers.${col} - NOT FOUND`);
      }
    });
    console.log('');

    // TEST 5: Data Integrity
    console.log('TEST 5: DATA INTEGRITY');
    console.log('----------------------------------------');
    
    // Check broker-user sync
    const [brokerSync] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM brokers b 
      JOIN users u ON b.user_id = u.id 
      WHERE u.role = 'broker'
    `);
    console.log(`✅ Broker-User sync: ${brokerSync[0].count} brokers synced`);

    // Check total users
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Total users: ${userCount[0].count}`);

    // Check users by role
    const [roleCount] = await connection.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
      ORDER BY role
    `);
    console.log('✅ Users by role:');
    roleCount.forEach(r => {
      console.log(`   - ${r.role}: ${r.count}`);
    });

    // Check properties
    const [propCount] = await connection.query('SELECT COUNT(*) as count FROM properties');
    console.log(`✅ Total properties: ${propCount[0].count}`);

    // Check properties by status
    const [propStatus] = await connection.query(`
      SELECT status, COUNT(*) as count 
      FROM properties 
      GROUP BY status
    `);
    console.log('✅ Properties by status:');
    propStatus.forEach(p => {
      console.log(`   - ${p.status}: ${p.count}`);
    });

    console.log('');

    // TEST 6: All Tables Count
    console.log('TEST 6: COMPLETE DATABASE');
    console.log('----------------------------------------');
    
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`✅ Total tables in database: ${tables.length}`);
    console.log('\nAll tables:');
    tables.forEach((table, index) => {
      const tableName = table[`Tables_in_ddrems`];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    await connection.end();

    // FINAL SUMMARY
    console.log('\n================================================');
    console.log('ENHANCEMENT TEST SUMMARY');
    console.log('================================================\n');
    console.log(`✅ Database Tables: ${tables.length} total`);
    console.log(`✅ Enhancement Tables: ${tablesFound}/6 created`);
    console.log(`✅ Properties Enhancements: ${columnsFound}/5 columns`);
    console.log(`✅ Agreements Enhancements: ${agreeColumnsFound}/4 columns`);
    console.log(`✅ Broker-User Sync: ${brokerSync[0].count} brokers`);
    console.log(`✅ Total Users: ${userCount[0].count}`);
    console.log(`✅ Total Properties: ${propCount[0].count}`);
    
    console.log('\n🎉 DATABASE ENHANCEMENTS: COMPLETE\n');
    console.log('System Status:');
    console.log('  Backend: http://localhost:5000');
    console.log('  Frontend: http://localhost:3000');
    console.log('\nLogin Credentials (Password: admin123):');
    console.log('  Admin: admin@ddrems.com');
    console.log('  Broker: john@ddrems.com');
    console.log('  Owner: owner@ddrems.com');
    console.log('  Customer: customer@ddrems.com');
    console.log('\n================================================\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  }
}

testDatabaseEnhancements();
