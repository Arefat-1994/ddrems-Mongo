const db = require('../server/config/db');
(async () => {
  try {
    // Check broker-related tables
    const [tables] = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%broker%' ORDER BY tablename");
    console.log('Broker tables:', tables.map(t => t.tablename));

    // Check if broker_profiles has the columns we need
    const [cols] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='broker_profiles' ORDER BY ordinal_position");
    if (cols.length > 0) {
      console.log('broker_profiles columns:', cols.map(c => c.column_name).join(', '));
    } else {
      console.log('broker_profiles table does NOT exist');
    }

    // Check profiles table for broker columns
    const [pcols] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name LIKE '%bonus%' OR table_name='profiles' AND column_name LIKE '%completed%' ORDER BY ordinal_position");
    console.log('profiles bonus/completed cols:', pcols.map(c => c.column_name));

    // Check current engagements for user 10 (broker Neja)
    const [engs] = await db.query("SELECT id, status, engagement_type, agreed_price, broker_commission_amount, completed_at FROM broker_engagements WHERE broker_id = 10");
    console.log('Broker 10 engagements:', engs);

    // Check commission tracking
    const [comms] = await db.query("SELECT * FROM commission_tracking WHERE broker_id = 10");
    console.log('Broker 10 commissions:', comms);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  process.exit(0);
})();
