const db = require('./server/config/db');

async function checkSchema() {
  try {
    const [cols] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_requests' ORDER BY ordinal_position"
    );
    console.log("=== agreement_requests columns ===");
    console.log(cols.map(c => c.column_name).join(', '));

    const [cols2] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_transactions' ORDER BY ordinal_position"
    );
    console.log("\n=== agreement_transactions columns ===");
    console.log(cols2.map(c => c.column_name).join(', '));

    const [cols3] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_commissions' ORDER BY ordinal_position"
    );
    console.log("\n=== agreement_commissions columns ===");
    console.log(cols3.map(c => c.column_name).join(', '));

    const [cols4] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'agreement_notifications' ORDER BY ordinal_position"
    );
    console.log("\n=== agreement_notifications columns ===");
    console.log(cols4.map(c => c.column_name).join(', '));

    // Check sample agreement data
    const [agreements] = await db.query(
      "SELECT id, status, current_step, proposed_price, property_price, broker_id, is_direct_agreement, commission_percentage, total_commission, buyer_signed, owner_signed, handover_confirmed, funds_released FROM agreement_requests LIMIT 5"
    );
    console.log("\n=== Sample Agreements ===");
    console.log(JSON.stringify(agreements, null, 2));

    process.exit(0);
  } catch(e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

checkSchema();
