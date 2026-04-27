const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'commission_tracking'
    `);
    console.log('Columns in commission_tracking:');
    res.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
