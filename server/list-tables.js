const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), database: process.env.DB_NAME, port: process.env.DB_PORT
});
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
  .then(r => { r.rows.forEach(x => console.log(x.table_name)); pool.end(); })
  .catch(e => { console.log(e.message); pool.end(); });
