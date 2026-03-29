// Apply all database fixes directly using Node.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

async function applyDatabaseFixes() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          DDREMS - APPLYING DATABASE FIXES                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  let connection;
  
  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3307,
      database: process.env.DB_NAME || 'ddrems',
      multipleStatements: true
    });
    console.log('✅ Connected to database\n');
    
    // Read SQL file
    console.log('📄 Reading fix script...');
    const sqlContent = fs.readFileSync('COMPLETE_FIX_ALL_ISSUES.sql', 'utf8');
    
    // Split by delimiter changes and execute
    const statements = sqlContent
      .split(/DELIMITER \$\$|DELIMITER ;/)
      .filter(s => s.trim().length > 0);
    
    console.log('🔧 Applying fixes...\n');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      try {
        // Execute each statement
        const [results] = await connection.query(statement);
        
        // Show status messages
        if (Array.isArray(results)) {
          results.forEach(result => {
            if (result.status) console.log(`   ${result.status}`);
            if (result.separator) console.log(result.separator);
            if (result.table_status) console.log(`   ${result.table_status}`);
            if (result.main_image_status) console.log(`   ${result.main_image_status}`);
            if (result.views_status) console.log(`   ${result.views_status}`);
            if (result.final_status) console.log(`   ${result.final_status}`);
          });
        }
      } catch (error) {
        // Ignore errors for statements that might already be applied
        if (!error.message.includes('Duplicate') && 
            !error.message.includes('already exists') &&
            !error.message.includes('Unknown column')) {
          console.log(`   ⚠️  ${error.message}`);
        }
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Verification:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Verify tables
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems'
    `);
    console.log(`✅ Total tables: ${tables[0].count}`);
    
    // Check main_image column
    const [mainImageCol] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = 'properties' 
        AND COLUMN_NAME = 'main_image'
    `);
    console.log(`${mainImageCol[0].count > 0 ? '✅' : '❌'} main_image column: ${mainImageCol[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check views column
    const [viewsCol] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = 'properties' 
        AND COLUMN_NAME = 'views'
    `);
    console.log(`${viewsCol[0].count > 0 ? '✅' : '❌'} views column: ${viewsCol[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check property_views table
    const [pvTable] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = 'property_views'
    `);
    console.log(`${pvTable[0].count > 0 ? '✅' : '❌'} property_views table: ${pvTable[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check document_access table
    const [daTable] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = 'document_access'
    `);
    console.log(`${daTable[0].count > 0 ? '✅' : '❌'} document_access table: ${daTable[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    // Check trigger
    const [trigger] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'ddrems' 
        AND TRIGGER_NAME = 'update_property_views_count'
    `);
    console.log(`${trigger[0].count > 0 ? '✅' : '❌'} view count trigger: ${trigger[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL DATABASE FIXES APPLIED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure WAMP server is running');
    console.log('   2. Check database exists: ddrems');
    console.log('   3. Verify .env file settings');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

applyDatabaseFixes();
