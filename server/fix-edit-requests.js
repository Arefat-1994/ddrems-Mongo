const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const pool = new Pool({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), database: process.env.DB_NAME, port: process.env.DB_PORT
});

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fix profile_edit_requests - add missing columns
    const cols = (await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='profile_edit_requests'"
    )).rows.map(r => r.column_name);
    console.log('Current profile_edit_requests cols:', cols.join(', '));

    const addCol = async (col, type) => {
      if (!cols.includes(col)) {
        await client.query(`ALTER TABLE profile_edit_requests ADD COLUMN ${col} ${type}`);
        console.log(`  Added ${col}`);
      }
    };

    await addCol('profile_type', "VARCHAR(50) DEFAULT 'customer'");
    await addCol('profile_id', 'INTEGER');
    await addCol('requested_changes', 'JSONB');
    await addCol('admin_notes', 'TEXT');
    await addCol('requested_at', 'TIMESTAMP DEFAULT NOW()');
    await addCol('reviewed_at', 'TIMESTAMP');
    await addCol('approved_at', 'TIMESTAMP');
    await addCol('rejected_at', 'TIMESTAMP');

    // Ensure is_read column on notifications is boolean
    const notifCols = (await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notifications'"
    )).rows;
    console.log('\nNotifications cols:');
    notifCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // Fix notifications.is_read if it exists as integer
    const isReadCol = notifCols.find(c => c.column_name === 'is_read');
    if (isReadCol && isReadCol.data_type === 'integer') {
      console.log('\n  Fixing notifications.is_read from integer to boolean...');
      await client.query(`ALTER TABLE notifications ALTER COLUMN is_read TYPE BOOLEAN USING is_read::boolean`);
      console.log('  ✅ Fixed');
    }

    await client.query('COMMIT');
    console.log('\n🎉 All fixes applied!');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}
fix();
