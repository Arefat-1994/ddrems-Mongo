const db = require('./server/config/db');
async function migrate() {
  try {
    console.log('Starting migration for video columns...');
    const queries = [
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_url TEXT",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_uploaded_at TIMESTAMP"
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
