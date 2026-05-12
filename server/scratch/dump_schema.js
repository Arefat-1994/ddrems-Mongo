const { Pool } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function dumpSchema() {
  try {
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    const schema = {};
    for (let row of tablesRes.rows) {
      const t = row.table_name;
      const colsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [t]);
      schema[t] = colsRes.rows.map(c => c.column_name + ': ' + c.data_type);
    }
    fs.writeFileSync(path.join(__dirname, 'schema.json'), JSON.stringify(schema, null, 2));
    console.log('Schema dumped to schema.json');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
dumpSchema();
