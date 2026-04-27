const db = require('./server/config/db');

async function fix() {
  console.log('\n=== BACKFILL & FIX ===\n');

  // 1. Backfill existing completed transactions
  const [r1] = await db.query(
    "UPDATE agreement_transactions SET owner_verified_payout = TRUE, broker_verified_payout = TRUE, owner_verified_at = NOW(), broker_verified_at = NOW() WHERE transaction_status = 'completed' AND owner_verified_payout = FALSE"
  );
  console.log('✅ Backfilled completed transactions:', r1.affectedRows, 'rows');

  // 2. Add missing columns to agreement_commissions if needed
  const missingCommCols = [
    "ALTER TABLE agreement_commissions ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP NULL",
    "ALTER TABLE agreement_commissions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)",
    "ALTER TABLE agreement_commissions ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)",
    "ALTER TABLE agreement_commissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
  ];
  for (const s of missingCommCols) {
    try { await db.query(s); console.log('✅ Commission col:', s.substring(50, 90)); }
    catch(e) { console.log('⚠️  Skip:', e.message.substring(0, 60)); }
  }

  // 3. Add missing columns to agreement_transactions if needed
  const missingTxCols = [
    "ALTER TABLE agreement_transactions ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(100)",
    "ALTER TABLE agreement_transactions ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100)",
    "ALTER TABLE agreement_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
  ];
  for (const s of missingTxCols) {
    try { await db.query(s); console.log('✅ TX col:', s.substring(50, 90)); }
    catch(e) { console.log('⚠️  Skip:', e.message.substring(0, 60)); }
  }

  // 4. Verify final state of both tables
  console.log('\n--- Final agreement_transactions columns ---');
  const [txCols] = await db.query(
    "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'agreement_transactions' ORDER BY ordinal_position"
  );
  txCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}) default=${c.column_default ?? 'NULL'}`));

  console.log('\n--- Final agreement_commissions columns ---');
  const [commCols] = await db.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_commissions' ORDER BY ordinal_position"
  );
  commCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  // 5. Show current state of all transactions
  console.log('\n--- Current agreement_transactions data ---');
  const [txData] = await db.query(
    "SELECT id, agreement_request_id, transaction_status, transaction_type, transaction_amount, commission_amount, net_amount, payout_payment_method, owner_verified_payout, broker_verified_payout FROM agreement_transactions ORDER BY id"
  );
  if (txData.length === 0) console.log('  (no transactions yet)');
  txData.forEach(r => console.log(
    `  TX#${r.id} Agr#${r.agreement_request_id} | ${r.transaction_status} | ${r.transaction_type} | amount=${r.transaction_amount} | commission=${r.commission_amount} | net=${r.net_amount} | method=${r.payout_payment_method} | owner_verified=${r.owner_verified_payout} | broker_verified=${r.broker_verified_payout}`
  ));

  // 6. Show current state of all commissions
  console.log('\n--- Current agreement_commissions data ---');
  const [commData] = await db.query(
    "SELECT id, agreement_request_id, commission_type, recipient_id, commission_amount, payment_status FROM agreement_commissions ORDER BY id"
  );
  if (commData.length === 0) console.log('  (no commissions yet)');
  commData.forEach(r => console.log(
    `  Comm#${r.id} Agr#${r.agreement_request_id} | ${r.commission_type} | recipient=${r.recipient_id} | amount=${r.commission_amount} | status=${r.payment_status}`
  ));

  // 7. Show all agreement_requests with their status
  console.log('\n--- All agreement_requests ---');
  const [agrData] = await db.query(
    "SELECT ar.id, ar.status, ar.current_step, ar.funds_released, u_c.name as customer, u_o.name as owner, p.title as property FROM agreement_requests ar LEFT JOIN users u_c ON u_c.id = ar.customer_id LEFT JOIN users u_o ON u_o.id = ar.owner_id LEFT JOIN properties p ON p.id = ar.property_id ORDER BY ar.id"
  );
  if (agrData.length === 0) console.log('  (no agreements yet)');
  agrData.forEach(r => console.log(
    `  Agr#${r.id} [${r.status}] step=${r.current_step} funds_released=${r.funds_released} | ${r.customer} → ${r.owner} | ${r.property}`
  ));

  console.log('\n=== ALL DONE ===\n');
  process.exit(0);
}

fix().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
