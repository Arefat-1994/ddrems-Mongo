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

    console.log('Checking agreement_notifications columns...\n');
    const [columns] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_notifications'
      ORDER BY ORDINAL_POSITION
    `);
    
    for (const col of columns) {
      console.log(`${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    }

    console.log('\n\nChecking agreement_audit_log columns...\n');
    const [auditCols] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'agreement_audit_log'
      ORDER BY ORDINAL_POSITION
    `);
    
    for (const col of auditCols) {
      console.log(`${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    }

    conn.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
