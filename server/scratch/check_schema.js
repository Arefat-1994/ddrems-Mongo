const db = require('../config/db');

async function checkSchema() {
  try {
    const [rows] = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'broker_temporary_bookings'
    `);
    console.log('Columns in broker_temporary_bookings:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSchema();
