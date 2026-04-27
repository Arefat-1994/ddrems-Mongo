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
      SELECT definition FROM pg_views WHERE viewname = 'v_broker_engagements';
    `);
    if (res.rows.length > 0) {
      console.log('Definition of v_broker_engagements:');
      console.log(res.rows[0].definition);
    } else {
      console.log('View v_broker_engagements not found');
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
