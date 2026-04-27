const db = require('../config/db');

async function migrate() {
  try {
    console.log('Adding customer_id column to broker_temporary_bookings...');
    await db.query(`
      ALTER TABLE broker_temporary_bookings 
      ADD COLUMN IF NOT EXISTS customer_id INTEGER
    `);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
