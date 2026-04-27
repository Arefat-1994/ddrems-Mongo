const db = require('./server/config/db');

async function check() {
  const [usersCols] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
  console.log("Users table:");
  console.log(usersCols.map(c => c.column_name));

  const [brokerCols] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'broker_profiles'");
  console.log("Broker profiles table:");
  console.log(brokerCols.map(c => c.column_name));

  const [customerCols] = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_profiles'");
  console.log("Customer profiles table:");
  console.log(customerCols.map(c => c.column_name));
  
  process.exit(0);
}

check().catch(console.error);
