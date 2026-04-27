const db = require('./config/db');

async function run() {
  const [cols] = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'broker_engagements'`);
  console.log('broker_engagements columns:', cols.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));
  
  const [cols2] = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'brokers'`);
  console.log('brokers columns:', cols2.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));
  
  const [cols3] = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'broker_profiles'`);
  console.log('broker_profiles columns:', cols3.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));
}

run().catch(console.error).finally(() => process.exit());
