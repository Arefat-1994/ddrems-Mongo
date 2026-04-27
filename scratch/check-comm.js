const db = require('../server/config/db');
async function run() {
  const [rows] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'commission_tracking'");
  console.log(rows.map(r => r.column_name));
  process.exit(0);
}
run();
