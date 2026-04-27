const db = require('../server/config/db');

async function test() {
  try {
    const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'site_checks'");
    // Note: the pg wrapper might return an array of rows or { rows } depending on how db.query is wrapped
    const rows = res.rows || (Array.isArray(res[0]) ? res[0] : res);
    console.log("Table columns:", rows);
  } catch (e) {
    console.log("Error:", e.message);
  }
  process.exit();
}
test();
