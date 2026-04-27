const db = require('./server/config/db');
async function migrate() {
  try {
    console.log('Starting migration...');
    await db.query("ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS system_fee_payer VARCHAR(50) DEFAULT 'buyer'");
    await db.query("ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS counter_offer_price NUMERIC");
    await db.query("ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS negotiation_rounds INTEGER DEFAULT 0");
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
migrate();
