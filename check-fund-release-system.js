const db = require('./server/config/db');

async function checkAll() {
  console.log('\n========================================');
  console.log('  FUND RELEASE & VERIFICATION SYSTEM CHECK');
  console.log('========================================\n');

  // 1. Check agreement_transactions columns
  console.log('1️⃣  Checking agreement_transactions columns...');
  try {
    const [cols] = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agreement_transactions'
      ORDER BY ordinal_position
    `);
    const needed = ['payout_payment_method','payout_receipt_path','owner_verified_payout','broker_verified_payout','owner_verified_at','broker_verified_at'];
    const found = cols.map(c => c.column_name);
    needed.forEach(n => {
      const col = cols.find(c => c.column_name === n);
      if (col) console.log(`   ✅ ${n} (${col.data_type}, default: ${col.column_default ?? 'NULL'})`);
      else console.log(`   ❌ MISSING: ${n}`);
    });
    console.log(`   📋 All columns: ${found.join(', ')}\n`);
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 2. Check agreement_commissions columns
  console.log('2️⃣  Checking agreement_commissions columns...');
  try {
    const [cols] = await db.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'agreement_commissions' ORDER BY ordinal_position
    `);
    console.log(`   📋 Columns: ${cols.map(c=>c.column_name).join(', ')}\n`);
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 3. Check agreement_requests status values
  console.log('3️⃣  Checking agreement_requests status distribution...');
  try {
    const [rows] = await db.query(`
      SELECT status, COUNT(*) as count FROM agreement_requests GROUP BY status ORDER BY count DESC
    `);
    if (rows.length === 0) console.log('   ℹ️  No agreement requests found');
    rows.forEach(r => console.log(`   📊 ${r.status}: ${r.count}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 4. Check funds_released agreements specifically
  console.log('4️⃣  Checking funds_released agreements...');
  try {
    const [rows] = await db.query(`
      SELECT ar.id, ar.status, ar.owner_id, ar.broker_id,
             at2.owner_verified_payout, at2.broker_verified_payout,
             at2.payout_payment_method, at2.transaction_status
      FROM agreement_requests ar
      LEFT JOIN agreement_transactions at2 ON at2.agreement_request_id = ar.id
      WHERE ar.status = 'funds_released'
      LIMIT 10
    `);
    if (rows.length === 0) console.log('   ℹ️  No funds_released agreements yet (expected if no flow completed)');
    rows.forEach(r => console.log(`   📄 Agreement #${r.id}: owner_verified=${r.owner_verified_payout}, broker_verified=${r.broker_verified_payout}, method=${r.payout_payment_method}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 5. Check agreement_transactions data
  console.log('5️⃣  Checking recent agreement_transactions...');
  try {
    const [rows] = await db.query(`
      SELECT id, agreement_request_id, transaction_status, transaction_type,
             transaction_amount, commission_amount, net_amount,
             payout_payment_method, owner_verified_payout, broker_verified_payout
      FROM agreement_transactions ORDER BY id DESC LIMIT 5
    `);
    if (rows.length === 0) console.log('   ℹ️  No transactions yet');
    rows.forEach(r => console.log(`   💰 TX#${r.id} (Agr#${r.agreement_request_id}): status=${r.transaction_status}, type=${r.transaction_type}, amount=${r.transaction_amount}, owner_verified=${r.owner_verified_payout}, broker_verified=${r.broker_verified_payout}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 6. Check agreement_commissions
  console.log('6️⃣  Checking recent agreement_commissions...');
  try {
    const [rows] = await db.query(`
      SELECT id, agreement_request_id, commission_type, recipient_id,
             commission_amount, payment_status
      FROM agreement_commissions ORDER BY id DESC LIMIT 5
    `);
    if (rows.length === 0) console.log('   ℹ️  No commissions yet');
    rows.forEach(r => console.log(`   📊 Comm#${r.id} (Agr#${r.agreement_request_id}): type=${r.commission_type}, amount=${r.commission_amount}, status=${r.payment_status}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 7. Check full workflow status flow
  console.log('7️⃣  Checking full workflow status flow (all agreements)...');
  try {
    const [rows] = await db.query(`
      SELECT ar.id, ar.status, ar.current_step,
             ar.funds_released, ar.funds_released_date,
             u_owner.name as owner_name,
             u_customer.name as customer_name,
             p.title as property_title
      FROM agreement_requests ar
      LEFT JOIN users u_owner ON u_owner.id = ar.owner_id
      LEFT JOIN users u_customer ON u_customer.id = ar.customer_id
      LEFT JOIN properties p ON p.id = ar.property_id
      ORDER BY ar.id DESC LIMIT 10
    `);
    if (rows.length === 0) console.log('   ℹ️  No agreements found');
    rows.forEach(r => console.log(`   🔄 Agr#${r.id} [${r.status}] step=${r.current_step} | ${r.customer_name} → ${r.owner_name} | ${r.property_title} | funds_released=${r.funds_released}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 8. Check agreement_requests has funds_released columns
  console.log('8️⃣  Checking agreement_requests for funds_released columns...');
  try {
    const [cols] = await db.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'agreement_requests'
      AND column_name IN ('funds_released','funds_released_date','funds_released_by','status')
    `);
    cols.forEach(c => console.log(`   ✅ ${c.column_name} (${c.data_type})`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 9. Check workflow history for fund release steps
  console.log('9️⃣  Checking agreement_workflow_history for fund release steps...');
  try {
    const [rows] = await db.query(`
      SELECT id, agreement_request_id, step_name, action, new_status, notes, created_at
      FROM agreement_workflow_history
      WHERE step_name IN ('Funds Released','Owner Verified Payout','Broker Verified Commission','Payout Verified')
      ORDER BY id DESC LIMIT 10
    `);
    if (rows.length === 0) console.log('   ℹ️  No fund release history yet');
    rows.forEach(r => console.log(`   📜 Agr#${r.agreement_request_id}: [${r.step_name}] → ${r.new_status} | ${r.notes}`));
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 10. Verify backend routes exist
  console.log('🔟  Checking backend route file...');
  try {
    const fs = require('fs');
    const content = fs.readFileSync('./server/routes/agreement-workflow.js', 'utf8');
    const checks = [
      ['release-funds endpoint', '/release-funds'],
      ['verify-payout endpoint', '/verify-payout'],
      ['broker-verify-payout endpoint', '/broker-verify-payout'],
      ['payout_payment_method saved', 'payout_payment_method'],
      ['payout_receipt_path saved', 'payout_receipt_path'],
      ['owner_verified_payout update', 'owner_verified_payout'],
      ['broker_verified_payout update', 'broker_verified_payout'],
      ['funds_released status set', "'funds_released'"],
      ['completed status set', "'completed'"],
    ];
    checks.forEach(([label, pattern]) => {
      if (content.includes(pattern)) console.log(`   ✅ ${label}`);
      else console.log(`   ❌ MISSING: ${label}`);
    });
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 11. Verify frontend AgreementWorkflow
  console.log('1️⃣1️⃣  Checking frontend AgreementWorkflow.js...');
  try {
    const fs = require('fs');
    const content = fs.readFileSync('./client/src/components/AgreementWorkflow.js', 'utf8');
    const checks = [
      ['funds_released in STATUS_MAP', "funds_released:"],
      ['verify_payout case', "case \"verify_payout\""],
      ['broker_verify_payout case', "case \"broker_verify_payout\""],
      ['payout_payment_method in release_funds', "payout_payment_method"],
      ['payout_receipt in release_funds', "payout_receipt"],
      ['Verify Payout Receipt button', "Verify Payout Receipt"],
      ['Verify Commission Payout button', "Verify Commission Payout"],
      ['initialFilter prop', "initialFilter"],
      ['statusFilter state', "statusFilter"],
    ];
    checks.forEach(([label, pattern]) => {
      if (content.includes(pattern)) console.log(`   ✅ ${label}`);
      else console.log(`   ❌ MISSING: ${label}`);
    });
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 12. Verify Sidebar has payout-verifications
  console.log('1️⃣2️⃣  Checking Sidebar.js...');
  try {
    const fs = require('fs');
    const content = fs.readFileSync('./client/src/components/Sidebar.js', 'utf8');
    if (content.includes('payout-verifications')) console.log('   ✅ payout-verifications sidebar item present');
    else console.log('   ❌ MISSING: payout-verifications sidebar item');
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  // 13. Verify PropertyAdminDashboard routing
  console.log('1️⃣3️⃣  Checking PropertyAdminDashboard.js...');
  try {
    const fs = require('fs');
    const content = fs.readFileSync('./client/src/components/PropertyAdminDashboard.js', 'utf8');
    if (content.includes("payout-verifications")) console.log('   ✅ payout-verifications route present');
    else console.log('   ❌ MISSING: payout-verifications route');
    if (content.includes("initialFilter")) console.log('   ✅ initialFilter prop passed');
    else console.log('   ❌ MISSING: initialFilter prop');
    console.log();
  } catch(e) { console.log('   ❌ Error:', e.message, '\n'); }

  console.log('========================================');
  console.log('  CHECK COMPLETE');
  console.log('========================================\n');
  process.exit(0);
}

checkAll().catch(e => { console.error('Fatal:', e); process.exit(1); });
