const db = require('./server/config/db');
(async () => {
  try {
    const [rows] = await db.query("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'properties' AND c.contype = 'c';");
    console.log(rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();
