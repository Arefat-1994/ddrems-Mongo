const db = require('./server/config/db');

async function run() {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';");
    console.log('users columns:', res[0].map(c => c.column_name));
    const res2 = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'broker_profiles';");
    console.log('broker_profiles columns:', res2[0].map(c => c.column_name));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
