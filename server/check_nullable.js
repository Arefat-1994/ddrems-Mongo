const db = require('./config/db');

(async () => {
  try {
    const [cols] = await db.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'properties' AND column_name IN ('broker_id', 'owner_id');
    `);
    console.log('Columns:');
    console.table(cols);
  } catch (error) {
    console.error('Error fetching columns:', error.message);
  }
  process.exit(0);
})();
