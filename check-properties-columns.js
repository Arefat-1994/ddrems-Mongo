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

    console.log('Checking properties table columns...\n');
    const [columns] = await conn.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ddrems' AND TABLE_NAME = 'properties'
      ORDER BY ORDINAL_POSITION
    `);
    
    for (const col of columns) {
      console.log(`${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    }

    conn.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
