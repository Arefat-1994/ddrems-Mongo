const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), database: process.env.DB_NAME, port: process.env.DB_PORT
});

async function check() {
  const tables = ['request_key', 'edit_requests', 'profile_edit_requests', 'agreement_requests'];
  for (const t of tables) {
    const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position", [t]);
    console.log(`\n=== ${t} (${r.rows.length} cols) ===`);
    r.rows.forEach(x => console.log(`  ${x.column_name}: ${x.data_type}`));
  }
  pool.end();
}
check().catch(e => { console.log(e.message); pool.end(); });
