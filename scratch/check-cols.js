const db = require('../server/config/db');
async function check() {
  const [rows] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_requests'");
  console.log(rows.map(r => r.column_name));
  process.exit(0);
}
check();
