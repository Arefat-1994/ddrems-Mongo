const db = require('./server/config/db');
async function migrate() {
  try {
    console.log('Starting migration for handover columns...');
    const queries = [
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS buyer_handover_confirmed BOOLEAN DEFAULT FALSE",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS buyer_handover_date TIMESTAMP",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS owner_handover_confirmed BOOLEAN DEFAULT FALSE",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS owner_handover_date TIMESTAMP"
    ];
    for (const q of queries) {
      await db.query(q);
    }
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
migrate();
