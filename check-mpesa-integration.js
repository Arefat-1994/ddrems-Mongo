const db = require('./server/config/db');
const fs = require('fs');

async function checkAll() {
  console.log('\n============================================');
  console.log('  M-PESA INTEGRATION FULL CHECK');
  console.log('============================================\n');

  let pass = 0, fail = 0;
  const ok  = (msg) => { console.log(`   ✅ ${msg}`); pass++; };
  const err = (msg) => { console.log(`   ❌ ${msg}`); fail++; };
  const hdr = (msg) => console.log(`\n${msg}`);

  // ── 1. ENV VARIABLES ──────────────────────────────────────────────────────
  hdr('1️⃣  Environment Variables (.env)');
  const env = fs.readFileSync('.env', 'utf8');
  ['MPESA_BASE_URL','MPESA_CONSUMER_KEY','MPESA_CONSUMER_SECRET',
   'MPESA_SHORTCODE','MPESA_INITIATOR_NAME','MPESA_SECURITY_CREDENTIAL',
   'MPESA_STK_PASSWORD','MPESA_CALLBACK_URL'].forEach(k => {
    env.includes(k) ? ok(k) : err(`MISSING: ${k}`);
  });

  // ── 2. SERVER FILES ───────────────────────────────────────────────────────
  hdr('2️⃣  Server Files');
  [
    ['server/services/mpesa.js',  ['getToken','stkPush','b2cPayout','reverseTransaction']],
    ['server/routes/mpesa.js',    ['/token','/stk-push','/callback','/confirm-payment','/b2c-payout','/reverse','/status']],
    ['server/index.js',           ["require('./routes/mpesa')", "'/api/mpesa'"]],
  ].forEach(([file, checks]) => {
    if (!fs.existsSync(file)) { err(`FILE MISSING: ${file}`); return; }
    const c = fs.readFileSync(file, 'utf8');
    checks.forEach(s => c.includes(s) ? ok(`${file} → ${s}`) : err(`${file} MISSING: ${s}`));
  });

  // ── 3. FRONTEND FILES ─────────────────────────────────────────────────────
  hdr('3️⃣  Frontend Files');
  [
    ['client/src/components/MpesaPayment.js',   ['/stk-push','confirm-payment','I\'ve Paid']],
    ['client/src/components/MpesaDashboard.js', ['b2c-payout','/token','Verify Payment','Test Connection']],
    ['client/src/components/AgreementWorkflow.js', [
      "import MpesaPayment",
      "payment_method === \"mpesa\"",
      "M-Pesa (Safaricom Ethiopia)",
      "<MpesaPayment"
    ]],
    ['client/src/components/Sidebar.js', [
      '"mpesa"',
      'M-Pesa Payments',
      'M-Pesa Dashboard'
    ]],
    ['client/src/components/PropertyAdminDashboard.js', [
      "import MpesaDashboard",
      "currentView === 'mpesa'",
      "<MpesaDashboard"
    ]],
    ['client/src/components/CustomerDashboard.js', [
      "import MpesaPayment",
      "case 'mpesa'"
    ]],
  ].forEach(([file, checks]) => {
    if (!fs.existsSync(file)) { err(`FILE MISSING: ${file}`); return; }
    const c = fs.readFileSync(file, 'utf8');
    checks.forEach(s => c.includes(s) ? ok(`${file.split('/').pop()} → ${s}`) : err(`${file.split('/').pop()} MISSING: ${s}`));
  });

  // ── 4. DATABASE TABLES ────────────────────────────────────────────────────
  hdr('4️⃣  Database Tables');
  try {
    const [tbl] = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name IN ('mpesa_transactions','agreement_payments','agreement_transactions') ORDER BY table_name"
    );
    const names = tbl.map(r => r.table_name);
    ['agreement_payments','agreement_transactions','mpesa_transactions'].forEach(t =>
      names.includes(t) ? ok(`Table: ${t}`) : err(`Table MISSING: ${t}`)
    );
  } catch(e) { err('DB query failed: ' + e.message); }

  // ── 5. mpesa_transactions COLUMNS ─────────────────────────────────────────
  hdr('5️⃣  mpesa_transactions Columns');
  try {
    const [cols] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'mpesa_transactions' ORDER BY ordinal_position"
    );
    const names = cols.map(c => c.column_name);
    ['id','agreement_id','buyer_id','phone','amount','merchant_request_id',
     'checkout_request_id','status','result_code','result_desc'].forEach(c =>
      names.includes(c) ? ok(`mpesa_transactions.${c}`) : err(`mpesa_transactions MISSING: ${c}`)
    );
  } catch(e) { err('mpesa_transactions check failed: ' + e.message); }

  // ── 6. agreement_payments COLUMNS ─────────────────────────────────────────
  hdr('6️⃣  agreement_payments Columns');
  try {
    const [cols] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_payments' ORDER BY ordinal_position"
    );
    const names = cols.map(c => c.column_name);
    console.log(`   📋 Columns: ${names.join(', ')}`);
    ['payment_method','payment_amount','transaction_reference','payment_status'].forEach(c =>
      names.includes(c) ? ok(`agreement_payments.${c}`) : err(`agreement_payments MISSING: ${c}`)
    );
  } catch(e) { err('agreement_payments check failed: ' + e.message); }

  // ── 7. BACKEND ROUTE COMPLETENESS ─────────────────────────────────────────
  hdr('7️⃣  Backend Route Completeness');
  const mpesaRoute = fs.readFileSync('server/routes/mpesa.js', 'utf8');
  [
    ['GET /token',            "router.get('/token'"],
    ['POST /stk-push',        "router.post('/stk-push'"],
    ['POST /callback',        "router.post('/callback'"],
    ['POST /confirm-payment', "router.post('/confirm-payment'"],
    ['POST /b2c-payout',      "router.post('/b2c-payout'"],
    ['POST /reverse',         "router.post('/reverse'"],
    ['GET /status/:id',       "router.get('/status/:agreementId'"],
  ].forEach(([label, pattern]) =>
    mpesaRoute.includes(pattern) ? ok(label) : err(`MISSING route: ${label}`)
  );

  // ── 8. MPESA SERVICE FUNCTIONS ────────────────────────────────────────────
  hdr('8️⃣  M-Pesa Service Functions');
  const svc = fs.readFileSync('server/services/mpesa.js', 'utf8');
  [
    ['getToken()',            'const getToken'],
    ['stkPush()',             'const stkPush'],
    ['b2cPayout()',           'const b2cPayout'],
    ['reverseTransaction()',  'const reverseTransaction'],
    ['module.exports',        'module.exports'],
    ['STK endpoint',          '/mpesa/stkpush/v3/processrequest'],
    ['B2C endpoint',          '/mpesa/b2c/v2/paymentrequest'],
    ['Reversal endpoint',     '/mpesa/reversal/v2/request'],
    ['Token endpoint',        '/v1/token/generate'],
  ].forEach(([label, pattern]) =>
    svc.includes(pattern) ? ok(label) : err(`MISSING: ${label}`)
  );

  // ── 9. AGREEMENT WORKFLOW PAYMENT FLOW ────────────────────────────────────
  hdr('9️⃣  Agreement Workflow Payment Integration');
  const aw = fs.readFileSync('client/src/components/AgreementWorkflow.js', 'utf8');
  [
    ['M-Pesa in payment method dropdown', 'M-Pesa (Safaricom Ethiopia)'],
    ['MpesaPayment component imported',   'import MpesaPayment'],
    ['M-Pesa conditional render',         'payment_method === "mpesa"'],
    ['MpesaPayment rendered inline',      '<MpesaPayment'],
    ['onSuccess callback',                'onSuccess'],
    ['onCancel callback',                 'onCancel'],
    ['Other payment methods still exist', 'bank_transfer'],
  ].forEach(([label, pattern]) =>
    aw.includes(pattern) ? ok(label) : err(`MISSING: ${label}`)
  );

  // ── 10. LIVE DB DATA ──────────────────────────────────────────────────────
  hdr('🔟  Live Database Data');
  try {
    const [agrs] = await db.query(
      "SELECT id, status, current_step FROM agreement_requests ORDER BY id DESC LIMIT 5"
    );
    if (agrs.length === 0) console.log('   ℹ️  No agreements yet');
    agrs.forEach(a => console.log(`   📄 Agr#${a.id} [${a.status}] step=${a.current_step}`));

    const [payments] = await db.query(
      "SELECT id, agreement_request_id, payment_method, payment_status, payment_amount FROM agreement_payments ORDER BY id DESC LIMIT 5"
    );
    if (payments.length === 0) console.log('   ℹ️  No payments yet');
    payments.forEach(p => console.log(`   💰 Pay#${p.id} Agr#${p.agreement_request_id} method=${p.payment_method} status=${p.payment_status} amount=${p.payment_amount}`));

    const [mpesaTx] = await db.query(
      "SELECT id, agreement_id, phone, amount, status FROM mpesa_transactions ORDER BY id DESC LIMIT 5"
    );
    if (mpesaTx.length === 0) console.log('   ℹ️  No M-Pesa transactions yet (expected)');
    mpesaTx.forEach(t => console.log(`   📱 MPesa#${t.id} Agr#${t.agreement_id} phone=${t.phone} amount=${t.amount} status=${t.status}`));
  } catch(e) { err('Live data check failed: ' + e.message); }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n============================================');
  console.log(`  RESULT: ${pass} passed, ${fail} failed`);
  if (fail === 0) console.log('  🎉 ALL CHECKS PASSED!');
  else console.log(`  ⚠️  ${fail} issue(s) need attention`);
  console.log('============================================\n');
  process.exit(0);
}

checkAll().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
