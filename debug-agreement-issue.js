const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '',
      database: 'ddrems'
    });

    console.log('🔍 Debugging Agreement Request Issue\n');

    // Check if tables exist
    console.log('1. Checking if agreement tables exist...');
    const [tables] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME LIKE 'agreement%'
    `);
    console.log(`   Found ${tables.length} agreement tables`);
    for (const t of tables) {
      console.log(`   ✅ ${t.TABLE_NAME}`);
    }

    // Check if property_admin exists
    console.log('\n2. Checking for property_admin user...');
    const [admins] = await conn.execute(
      'SELECT id, name, role FROM users WHERE role = "property_admin"'
    );
    if (admins.length > 0) {
      console.log(`   ✅ Found ${admins.length} property admin(s)`);
      for (const admin of admins) {
        console.log(`      ID: ${admin.id}, Name: ${admin.name}`);
      }
    } else {
      console.log('   ❌ NO PROPERTY ADMIN FOUND - This is the issue!');
    }

    // Check properties
    console.log('\n3. Checking properties...');
    const [props] = await conn.execute(
      'SELECT id, title, owner_id, broker_id FROM properties LIMIT 5'
    );
    console.log(`   Found ${props.length} properties`);
    for (const p of props) {
      console.log(`   ID: ${p.id}, Title: ${p.title}, Owner: ${p.owner_id}, Broker: ${p.broker_id}`);
    }

    // Check if agreement_requests table has correct structure
    console.log('\n4. Checking agreement_requests table structure...');
    const [columns] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_requests'
    `);
    console.log(`   Found ${columns.length} columns`);
    for (const col of columns) {
      console.log(`   ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    }

    // Check if agreement_notifications table exists
    console.log('\n5. Checking agreement_notifications table...');
    const [notifCheck] = await conn.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_notifications'
    `);
    if (notifCheck[0].count > 0) {
      console.log('   ✅ agreement_notifications table exists');
    } else {
      console.log('   ❌ agreement_notifications table MISSING');
    }

    // Check if agreement_audit_log table exists
    console.log('\n6. Checking agreement_audit_log table...');
    const [auditCheck] = await conn.execute(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_audit_log'
    `);
    if (auditCheck[0].count > 0) {
      console.log('   ✅ agreement_audit_log table exists');
    } else {
      console.log('   ❌ agreement_audit_log table MISSING');
    }

    console.log('\n✅ Debug complete!');
    conn.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
