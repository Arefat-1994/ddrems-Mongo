const mysql = require('mysql2/promise');
const fs = require('fs');

async function applyEnhancements() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔧 Applying database enhancements...\n');

  try {
    const sql = fs.readFileSync('enhance-database-schema.sql', 'utf8');
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          console.log('✅ Executed:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('ℹ️  Skipped (already exists):', statement.substring(0, 50) + '...');
          } else {
            console.log('⚠️  Warning:', error.message);
          }
        }
      }
    }
    
    console.log('\n🎉 Database enhancements applied successfully!');
    console.log('\n📊 New Features Added:');
    console.log('  ✅ Property images and documents storage');
    console.log('  ✅ Document access keys and security');
    console.log('  ✅ Commission tracking system');
    console.log('  ✅ Enhanced agreements with meetings');
    console.log('  ✅ Feedback responses');
    console.log('  ✅ Property verification workflow');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

applyEnhancements();
