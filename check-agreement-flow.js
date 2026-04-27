const db = require('./server/config/db');
const fs = require('fs');

async function auditFlow() {
  console.log('\n============================================');
  console.log('  AGREEMENT WORKFLOW FULL AUDIT');
  console.log('============================================\n');

  // 1. Check for duplicate routes
  console.log('1️⃣  Checking for duplicate route definitions...');
  const content = fs.readFileSync('./server/routes/agreement-workflow.js', 'utf8');
  const routeRegex = /router\.(get|post|put|delete)\(["']([^"']+)["']/g;
  const seen = {};
  const dupes = [];
  let m;
  while ((m = routeRegex.exec(content)) !== null) {
    const key = m[1].toUpperCase() + ' ' + m[2];
    if (seen[key]) dupes.push(key);
    else seen[key] = true;
  }
  if (dupes.length === 0) console.log('   ✅ No duplicate routes found');
  else dupes.forEach(d => console.log(`   ❌ DUPLICATE: ${d}`));
  console.log();

  // 2. Verify all frontend actions map to backend routes
  console.log('2️⃣  Verifying frontend → backend route mapping...');
  const flowMap = [
    { action: 'request',              method: 'POST', route: '/request',                    status_before: null,                      status_after: 'pending_admin_review' },
    { action: 'forward',              method: 'PUT',  route: '/:id/forward-to-owner',        status_before: 'pending_admin_review',    status_after: 'waiting_owner_response' },
    { action: 'decision (accept)',    method: 'PUT',  route: '/:id/owner-decision',          status_before: 'waiting_owner_response',  status_after: 'owner_accepted' },
    { action: 'decision (counter)',   method: 'PUT',  route: '/:id/owner-decision',          status_before: 'waiting_owner_response',  status_after: 'counter_offer' },
    { action: 'forward_counter',      method: 'PUT',  route: '/:id/forward-counter-offer',   status_before: 'counter_offer',           status_after: 'counter_offer_forwarded' },
    { action: 'buyer_counter_resp',   method: 'PUT',  route: '/:id/buyer-counter-response',  status_before: 'counter_offer_forwarded', status_after: 'buyer_counter_offer' },
    { action: 'forward_buyer_counter',method: 'PUT',  route: '/:id/forward-buyer-counter',   status_before: 'buyer_counter_offer',     status_after: 'buyer_counter_offer_forwarded' },
    { action: 'generate',             method: 'POST', route: '/:id/generate-agreement',      status_before: 'owner_accepted',          status_after: 'agreement_generated' },
    { action: 'buyer_sign',           method: 'PUT',  route: '/:id/buyer-sign',              status_before: 'agreement_generated',     status_after: 'buyer_signed' },
    { action: 'owner_sign',           method: 'PUT',  route: '/:id/owner-sign',              status_before: 'buyer_signed',            status_after: 'fully_signed' },
    { action: 'submit_payment',       method: 'POST', route: '/:id/submit-payment',          status_before: 'fully_signed',            status_after: 'payment_submitted' },
    { action: 'verify_payment',       method: 'PUT',  route: '/:id/verify-payment',          status_before: 'payment_submitted',       status_after: 'payment_verified' },
    { action: 'confirm_handover',     method: 'PUT',  route: '/:id/confirm-handover',        status_before: 'payment_verified',        status_after: 'handover_confirmed' },
    { action: 'release_funds',        method: 'PUT',  route: '/:id/release-funds',           status_before: 'handover_confirmed',      status_after: 'funds_released' },
    { action: 'verify_payout',        method: 'PUT',  route: '/:id/verify-payout',           status_before: 'funds_released',          status_after: 'completed' },
    { action: 'broker_verify_payout', method: 'PUT',  route: '/:id/broker-verify-payout',    status_before: 'funds_released',          status_after: 'completed' },
  ];

  flowMap.forEach(f => {
    const routeKey = f.method + ' ' + f.route.replace('/:id', '/:agreementId');
    const exists = seen[routeKey];
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} [${f.action}] ${f.method} ${f.route}`);
    console.log(`      ${f.status_before || 'NEW'} → ${f.status_after}`);
  });
  console.log();

  // 3. Check STATUS_MAP in frontend
  console.log('3️⃣  Checking STATUS_MAP completeness in AgreementWorkflow.js...');
  const fe = fs.readFileSync('./client/src/components/AgreementWorkflow.js', 'utf8');
  const statuses = [
    'pending_admin_review', 'waiting_owner_response', 'counter_offer',
    'counter_offer_forwarded', 'buyer_counter_offer', 'buyer_counter_offer_forwarded',
    'buyer_rejected', 'owner_rejected', 'owner_accepted', 'agreement_generated',
    'buyer_signed', 'fully_signed', 'payment_submitted', 'payment_verified',
    'handover_confirmed', 'funds_released', 'completed'
  ];
  statuses.forEach(s => {
    if (fe.includes(`${s}:`)) console.log(`   ✅ ${s}`);
    else console.log(`   ⚠️  ${s} — not in STATUS_MAP (may show as unknown badge)`);
  });
  console.log();

  // 4. Check all action buttons exist for each role
  console.log('4️⃣  Checking role-based action buttons...');
  const adminButtons = [
    ['pending_admin_review → Forward to Owner', 'Forward to Owner'],
    ['counter_offer → Forward Counter Offer', 'Forward Counter Offer'],
    ['buyer_counter_offer → Forward Buyer Counter', 'Forward'],
    ['owner_accepted → Generate Agreement', 'Generate Agreement'],
    ['payment_submitted → Verify Payment', 'Verify Payment'],
    ['handover_confirmed → Release Funds', 'Release Funds'],
  ];
  const ownerButtons = [
    ['waiting_owner_response → Review & Decide', 'Review & Decide'],
    ['buyer_counter_offer_forwarded → Respond', 'Respond to'],
    ['buyer_signed → Sign Agreement', 'Sign Agreement'],
    ['funds_released → Verify Payout', 'Verify Payout Receipt'],
  ];
  const buyerButtons = [
    ['counter_offer_forwarded → Respond', 'Respond to Counter Offer'],
    ['agreement_generated → Sign', 'Sign Agreement'],
    ['fully_signed → Pay', 'Pay Now'],
    ['payment_verified → Confirm Handover', 'Confirm Handover'],
  ];
  const brokerButtons = [
    ['funds_released → Verify Commission', 'Verify Commission Payout'],
  ];

  console.log('   Admin:');
  adminButtons.forEach(([label, text]) => {
    console.log(`   ${fe.includes(text) ? '✅' : '❌'} ${label}`);
  });
  console.log('   Owner:');
  ownerButtons.forEach(([label, text]) => {
    console.log(`   ${fe.includes(text) ? '✅' : '❌'} ${label}`);
  });
  console.log('   Buyer/Customer:');
  buyerButtons.forEach(([label, text]) => {
    console.log(`   ${fe.includes(text) ? '✅' : '❌'} ${label}`);
  });
  console.log('   Broker:');
  brokerButtons.forEach(([label, text]) => {
    console.log(`   ${fe.includes(text) ? '✅' : '❌'} ${label}`);
  });
  console.log();

  // 5. Check DB workflow history
  console.log('5️⃣  Checking agreement_workflow_history...');
  try {
    const [rows] = await db.query(
      'SELECT agreement_request_id, step_name, action, previous_status, new_status, notes FROM agreement_workflow_history ORDER BY id DESC LIMIT 15'
    );
    if (rows.length === 0) console.log('   ℹ️  No history yet');
    rows.forEach(r => console.log(`   Agr#${r.agreement_request_id} | ${r.step_name} | ${r.previous_status} → ${r.new_status}`));
  } catch(e) { console.log('   ❌', e.message); }
  console.log();

  // 6. Check current agreement statuses in DB
  console.log('6️⃣  Current agreement statuses in DB...');
  try {
    const [rows] = await db.query(
      `SELECT ar.id, ar.status, ar.current_step, ar.funds_released,
              u_c.name as customer, u_o.name as owner, p.title as property
       FROM agreement_requests ar
       LEFT JOIN users u_c ON u_c.id = ar.customer_id
       LEFT JOIN users u_o ON u_o.id = ar.owner_id
       LEFT JOIN properties p ON p.id = ar.property_id
       ORDER BY ar.id DESC`
    );
    if (rows.length === 0) console.log('   ℹ️  No agreements in DB');
    rows.forEach(r => console.log(`   Agr#${r.id} [${r.status}] step=${r.current_step} | ${r.customer} → ${r.owner} | ${r.property}`));
  } catch(e) { console.log('   ❌', e.message); }
  console.log();

  // 7. Check Sidebar has payout-verifications for property_admin
  console.log('7️⃣  Checking Sidebar payout-verifications item...');
  const sidebar = fs.readFileSync('./client/src/components/Sidebar.js', 'utf8');
  console.log(`   ${sidebar.includes('payout-verifications') ? '✅' : '❌'} payout-verifications in property_admin sidebar`);
  console.log();

  // 8. Check PropertyAdminDashboard routing
  console.log('8️⃣  Checking PropertyAdminDashboard routing...');
  const pad = fs.readFileSync('./client/src/components/PropertyAdminDashboard.js', 'utf8');
  console.log(`   ${pad.includes("payout-verifications") ? '✅' : '❌'} payout-verifications route`);
  console.log(`   ${pad.includes("initialFilter") ? '✅' : '❌'} initialFilter prop passed`);
  console.log(`   ${pad.includes("AgreementWorkflow") ? '✅' : '❌'} AgreementWorkflow imported`);
  console.log();

  console.log('============================================');
  console.log('  AUDIT COMPLETE');
  console.log('============================================\n');
  process.exit(0);
}

auditFlow().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
