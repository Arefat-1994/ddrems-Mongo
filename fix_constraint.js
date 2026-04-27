const db = require('./server/config/db');

(async () => {
  try {
    await db.query('ALTER TABLE properties DROP CONSTRAINT properties_status_check');
    await db.query("ALTER TABLE properties ADD CONSTRAINT properties_status_check CHECK (status::text = ANY (ARRAY['active'::character varying, 'pending'::character varying, 'sold'::character varying, 'rented'::character varying, 'inactive'::character varying, 'reserved'::character varying, 'suspended'::character varying]::text[]))");
    console.log('Constraint updated successfully.');
  } catch(e) {
    console.error('Error updating constraint:', e.message);
  } finally {
    process.exit(0);
  }
})();
