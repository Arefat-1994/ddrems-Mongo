const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ddrems',
  port: process.env.DB_PORT || 3307
};

async function check() {
  try {
    const connection = await mysql.createConnection(DB_CONFIG);
    
    console.log('\n📋 NOTIFICATIONS TABLE SCHEMA:\n');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'notifications' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [DB_CONFIG.database]);

    columns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.COLUMN_TYPE.padEnd(20)} | Nullable: ${col.IS_NULLABLE} | Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
    });

    console.log('\n📋 MESSAGES TABLE SCHEMA:\n');
    const [msgColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'messages' AND TABLE_SCHEMA = ?
      ORDER BY ORDINAL_POSITION
    `, [DB_CONFIG.database]);

    msgColumns.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(20)} | ${col.COLUMN_TYPE.padEnd(20)} | Nullable: ${col.IS_NULLABLE} | Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

check();
