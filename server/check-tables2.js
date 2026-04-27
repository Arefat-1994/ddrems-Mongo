const db = require('./config/db');

async function run() {
  const [cols] = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties'`);
  console.log('properties columns:', cols.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));

  const [cols2] = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'commission_tracking'`);
  console.log('commission_tracking columns:', cols2.map(c => c.column_name + ' (' + c.data_type + ')').join('\n'));
}

run().catch(console.error).finally(() => process.exit());
