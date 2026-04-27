const db = require('../server/config/db');
async function run() {
  try {
    const tables = ['transactions', 'payments', 'rental_payment_schedules', 'agreement_transactions', 'agreement_commissions', 'agreement_payments'];
    for (const t of tables) {
      const [cols] = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=$1", [t]);
      console.log(`\n=== ${t} ===`);
      console.log(cols.map(c => `  ${c.column_name} (${c.data_type})`).join('\n'));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
