const mysql = require('mysql2/promise');
const fs = require('fs');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: '',
      database: 'ddrems'
    });
    
    const schema = fs.readFileSync('./database/REAL_ESTATE_AGREEMENT_SYSTEM.sql', 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    
    let count = 0;
    let skipped = 0;
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        try {
          await conn.execute(stmt);
          count++;
        } catch (e) {
          if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.code === 'ER_DUP_FIELDNAME' || e.code === 'ER_DUP_KEYNAME') {
            skipped++;
          } else {
            console.error('Error:', e.message.substring(0, 100));
          }
        }
      }
    }
    
    console.log('\n✅ Database schema applied!');
    console.log(`   Executed: ${count} statements`);
    console.log(`   Skipped: ${skipped} (already exist)`);
    conn.end();
  } catch (e) {
    console.error('Connection error:', e.message);
    process.exit(1);
  }
})();
