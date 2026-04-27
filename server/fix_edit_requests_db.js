const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'arefat',
  database: 'ddre',
  port: 5432
});

async function fixDatabase() {
  try {
    console.log('Fixing profile_edit_requests constraints...');
    
    // 1. Add default value to request_type
    await pool.query("ALTER TABLE profile_edit_requests ALTER COLUMN request_type SET DEFAULT 'profile_edit'");
    
    // 2. Set request_type to 'profile_edit' for any existing NULL values (though there shouldn't be any because of NOT NULL constraint)
    // But if we encounter columns that are NOT NULL and don't have defaults, we set them.
    
    // 3. Let's make profile_id nullable if it's not? (Already check, it is YES)
    
    // 4. Ensure created_at / requested_at have defaults
    await pool.query("ALTER TABLE profile_edit_requests ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP");
    await pool.query("ALTER TABLE profile_edit_requests ALTER COLUMN requested_at SET DEFAULT now()");

    console.log('Successfully updated profile_edit_requests!');

    // Verify
    const res = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'profile_edit_requests'
      AND column_name IN ('request_type', 'created_at', 'requested_at')
    `);
    console.table(res.rows);

  } catch (err) {
    console.error('Error during database fix:', err);
  } finally {
    pool.end();
  }
}

fixDatabase();
