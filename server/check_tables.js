const db = require('./config/db');

(async () => {
  try {
    const [tables] = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log(tables.map(t => t.table_name));
  } catch (error) {
    console.error(error);
  }
  process.exit(0);
})();
