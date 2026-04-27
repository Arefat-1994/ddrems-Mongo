const db = require('./config/db');

(async () => {
  try {
    // Check if notifications table exists
    const [tables] = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications'"
    );
    console.log('notifications table exists:', tables.length > 0);

    if (tables.length === 0) {
      console.log('Creating notifications table...');
      await db.pool.query(`
        CREATE TABLE notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255),
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          link VARCHAR(500),
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('✅ notifications table created!');
    } else {
      const [cols] = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'"
      );
      console.log('Columns:', cols.map(c => c.column_name));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  setTimeout(() => process.exit(), 1000);
})();
