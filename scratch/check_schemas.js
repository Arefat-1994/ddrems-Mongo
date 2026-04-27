const db = require('../server/config/db');
async function run() {
  try {
    const [rows] = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%payment%' OR table_name LIKE '%rent%' OR table_name LIKE '%transact%')");
    console.log(rows.map(r => r.table_name).join('\n'));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
