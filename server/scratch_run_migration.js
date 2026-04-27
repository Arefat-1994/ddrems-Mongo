const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function run() {
  const sqlPath = path.join(__dirname, '../database/ADD_FUND_RELEASE_VERIFICATIONS.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await db.query(sql);
    console.log('Migration successful');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Columns already exist. Proceeding...');
    } else {
      console.error('Migration failed:', err.message);
    }
  }

  process.exit(0);
}

run();
