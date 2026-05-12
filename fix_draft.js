const db = require('./server/config/db');

async function fix() {
  try {
    console.log('Step 1: Dropping old constraint...');
    await db.query('ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check');

    console.log('Step 2: Adding new constraint with draft + reserved...');
    await db.query(`ALTER TABLE properties ADD CONSTRAINT properties_status_check CHECK (status::text IN ('active', 'pending', 'sold', 'rented', 'inactive', 'suspended', 'draft', 'reserved'))`);

    console.log('Step 3: Restoring reserved status for properties 9, 20, 92...');
    await db.query("UPDATE properties SET status = 'reserved' WHERE id IN (9, 20, 92)");

    console.log('Done! Constraint now allows: active, pending, sold, rented, inactive, suspended, draft, reserved');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

fix();
