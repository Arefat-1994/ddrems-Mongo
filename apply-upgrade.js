const mysql = require('mysql2');
const fs = require('fs');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: '',
  database: 'ddrems',
  multipleStatements: true
});

console.log('🔄 Connecting to database...');

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }

  console.log('✅ Connected to database');
  console.log('🔄 Reading upgrade script...');

  const sql = fs.readFileSync('COMPLETE_SYSTEM_UPGRADE.sql', 'utf8');

  console.log('🔄 Applying database upgrade...');

  connection.query(sql, (error, results) => {
    if (error) {
      console.error('❌ Upgrade failed:', error.message);
      connection.end();
      process.exit(1);
    }

    console.log('✅ Database upgrade completed successfully!');
    console.log('\n📊 New tables created:');
    console.log('   - customer_profiles');
    console.log('   - owner_profiles');
    console.log('   - broker_profiles');
    console.log('   - agreement_requests');
    console.log('   - property_requests');

    // Verify tables
    connection.query("SHOW TABLES LIKE '%_profiles'", (err, tables) => {
      if (!err && tables.length > 0) {
        console.log('\n✅ Verification: Profile tables created');
      }

      connection.query("SHOW TABLES LIKE '%_requests'", (err, tables) => {
        if (!err && tables.length > 0) {
          console.log('✅ Verification: Request tables created');
        }

        console.log('\n🎉 Upgrade complete! Ready for next steps.');
        connection.end();
      });
    });
  });
});
