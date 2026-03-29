const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ddrems',
    port: parseInt(process.env.DB_PORT) || 3307
  });

  try {
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'create_request_key.sql'), 'utf8');
    // mysql2/promise query doesn't like multiple statements in one call by default, 
    // but our SQL is just one CREATE TABLE IF NOT EXISTS.
    await connection.query(sql);
    console.log('✅ request_key table created successfully');
  } catch (error) {
    console.error('❌ Error creating table:', error);
  } finally {
    await connection.end();
  }
}

migrate();
