const db = require('./config/db');

(async () => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
      [5]
    );
    console.log('Query success, rows:', rows.length);
    console.log(JSON.stringify(rows.slice(0, 2), null, 2));
  } catch (e) {
    console.error('Query error:', e.message);
  }
  setTimeout(() => process.exit(), 1000);
})();
