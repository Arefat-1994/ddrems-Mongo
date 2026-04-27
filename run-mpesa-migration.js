const db = require('./server/config/db');

async function migrate() {
  console.log('\n=== M-Pesa Migration ===\n');

  const stmts = [
    `CREATE TABLE IF NOT EXISTS mpesa_transactions (
      id SERIAL PRIMARY KEY,
      agreement_id INT,
      buyer_id INT,
      phone VARCHAR(20),
      amount DECIMAL(15,2),
      merchant_request_id VARCHAR(100),
      checkout_request_id VARCHAR(100),
      status VARCHAR(30) DEFAULT 'pending',
      result_code VARCHAR(10),
      result_desc TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_mpesa_agreement ON mpesa_transactions(agreement_id)`,
    `CREATE INDEX IF NOT EXISTS idx_mpesa_merchant ON mpesa_transactions(merchant_request_id)`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,2)`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(200)`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS receipt_file_path TEXT`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS verified_by_id INT`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS verified_date TIMESTAMP`,
    `ALTER TABLE agreement_payments ADD COLUMN IF NOT EXISTS verification_notes TEXT`
  ];

  for (const s of stmts) {
    try {
      await db.query(s);
      console.log('✅', s.substring(0, 70).replace(/\n/g, ' '));
    } catch (e) {
      console.log('⚠️  Skip:', e.message.substring(0, 80));
    }
  }

  // Verify
  const [cols] = await db.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_payments' ORDER BY ordinal_position"
  );
  console.log('\nagreement_payments columns:', cols.map(c => c.column_name).join(', '));

  const [tbl] = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_name = 'mpesa_transactions'"
  );
  console.log('mpesa_transactions table:', tbl.length > 0 ? '✅ exists' : '❌ missing');

  console.log('\n=== Migration Complete ===\n');
  process.exit(0);
}

migrate().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
