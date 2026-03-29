const db = require('./server/config/db');

async function runMigration() {
  const queries = [
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS owner_signature TEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS customer_signature TEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS owner_signed_at DATETIME",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS customer_signed_at DATETIME",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS agreement_html LONGTEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS additional_terms TEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS duration VARCHAR(100)",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS payment_terms TEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS special_conditions TEXT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS customer_id INT",
    "ALTER TABLE agreements ADD COLUMN IF NOT EXISTS agreement_text TEXT",
    "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS admin_id INT",
    "ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS forwarded_to_owner BOOLEAN DEFAULT FALSE"
  ];

  for (const q of queries) {
    try {
      await db.query(q);
      console.log('OK:', q.substring(0, 60));
    } catch (e) {
      console.log('Note:', e.message.substring(0, 80));
    }
  }
  console.log('All migrations complete!');
  process.exit(0);
}

runMigration();
