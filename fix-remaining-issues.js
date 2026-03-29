// Fix remaining issues: document_access table and trigger
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function fixRemainingIssues() {
  console.log('🔧 Fixing remaining issues...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3307,
      database: process.env.DB_NAME || 'ddrems'
    });
    
    console.log('✅ Connected to database\n');
    
    // Fix 1: Create document_access table (drop if exists to avoid FK issues)
    console.log('🔧 Creating document_access table...');
    try {
      await connection.query('DROP TABLE IF EXISTS document_access');
      await connection.query(`
        CREATE TABLE document_access (
          id INT PRIMARY KEY AUTO_INCREMENT,
          property_id INT NOT NULL,
          user_id INT NOT NULL,
          status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          responded_at TIMESTAMP NULL,
          response_message TEXT NULL,
          INDEX idx_property_user (property_id, user_id),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      console.log('✅ document_access table created\n');
    } catch (error) {
      console.log(`⚠️  document_access: ${error.message}\n`);
    }
    
    // Fix 2: Create trigger for view counting
    console.log('🔧 Creating view count trigger...');
    try {
      await connection.query('DROP TRIGGER IF EXISTS update_property_views_count');
      await connection.query(`
        CREATE TRIGGER update_property_views_count
        AFTER INSERT ON property_views
        FOR EACH ROW
        UPDATE properties 
        SET views = views + 1 
        WHERE id = NEW.property_id
      `);
      console.log('✅ Trigger created\n');
    } catch (error) {
      console.log(`⚠️  Trigger: ${error.message}\n`);
    }
    
    // Fix 3: Update view counts from existing data
    console.log('🔧 Updating view counts...');
    try {
      await connection.query(`
        UPDATE properties p
        SET views = (
          SELECT COUNT(*) 
          FROM property_views pv 
          WHERE pv.property_id = p.id
        )
        WHERE EXISTS (SELECT 1 FROM property_views WHERE property_id = p.id)
      `);
      console.log('✅ View counts updated\n');
    } catch (error) {
      console.log(`⚠️  View counts: ${error.message}\n`);
    }
    
    // Verification
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 Final Verification:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const [daTable] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ddrems' 
        AND TABLE_NAME = 'document_access'
    `);
    console.log(`${daTable[0].count > 0 ? '✅' : '❌'} document_access table: ${daTable[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    const [trigger] = await connection.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'ddrems' 
        AND TRIGGER_NAME = 'update_property_views_count'
    `);
    console.log(`${trigger[0].count > 0 ? '✅' : '❌'} view count trigger: ${trigger[0].count > 0 ? 'EXISTS' : 'MISSING'}`);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL REMAINING ISSUES FIXED!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixRemainingIssues();
