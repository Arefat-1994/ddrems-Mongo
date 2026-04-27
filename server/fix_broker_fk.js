const db = require('./config/db');

(async () => {
  try {
    console.log('Fixing properties_broker_id_fkey constraint...');

    // Drop the old constraint pointing to 'brokers'
    await db.query(`ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_broker_id_fkey`);
    console.log('Dropped old properties_broker_id_fkey constraint (if existed).');

    // Add new constraint pointing to 'users'
    await db.query(`
      ALTER TABLE properties
      ADD CONSTRAINT properties_broker_id_fkey
      FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('Added new properties_broker_id_fkey referencing users(id) successfully.');
  } catch (error) {
    console.error('Error migrating constraint:', error.message);
  }
  process.exit(0);
})();
