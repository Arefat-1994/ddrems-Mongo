const db = require('./config/db');

(async () => {
  try {
    const [cols] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_verification' ORDER BY ordinal_position"
    );
    console.log('property_verification columns:');
    console.log(JSON.stringify(cols, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
  setTimeout(() => process.exit(), 1000);
})();
