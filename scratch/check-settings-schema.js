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

async function test() {
  const tables = ['audit_log', 'system_audit_log', 'user_preferences', 'system_config', 'user_sessions', 'user_two_factor_settings'];
  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`);
      console.log(`\n=== ${table} ===`);
      if (res.rows.length === 0) {
        console.log('  (Table does not exist)');
      } else {
        res.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
      }
    } catch (e) {
      console.log(`\n=== ${table} ===\n  Error: ${e.message}`);
    }
  }
  pool.end();
}
test();
