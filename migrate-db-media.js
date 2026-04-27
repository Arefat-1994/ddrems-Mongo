const db = require('./server/config/db');
async function migrate() {
  try {
    console.log('Starting migration...');
    const queries = [
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released BOOLEAN DEFAULT FALSE",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released_at TIMESTAMP",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released_by INTEGER",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_viewed BOOLEAN DEFAULT FALSE",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_viewed_at TIMESTAMP",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified BOOLEAN DEFAULT FALSE",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified_at TIMESTAMP",
      "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified_by INTEGER"
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
