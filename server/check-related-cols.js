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
    const tables = ['broker_engagement_history', 'broker_engagement_messages', 'broker_engagement_signatures'];
    for (const table of tables) {
      const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
      console.log(`Columns in ${table}:`);
      res.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type})`);
      });
      console.log('');
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
