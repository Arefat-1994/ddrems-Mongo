const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'arefat',
  database: 'ddre',
  port: 5432
});

async function checkSchema() {
  try {
    console.log('--- profile_edit_requests schema ---');
    const res = await pool.query(`
      SELECT column_name, is_nullable, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'profile_edit_requests'
      ORDER BY ordinal_position
    `);
    console.table(res.rows);
    
    console.log('\n--- Checking if there are any records in profile_edit_requests ---');
    const records = await pool.query('SELECT COUNT(*) FROM profile_edit_requests');
    console.log('Count:', records.rows[0].count);

    console.log('\n--- Checking edit_requests table too ---');
    const res2 = await pool.query(`
      SELECT column_name, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'edit_requests'
    `);
    console.table(res2.rows);

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

checkSchema();
