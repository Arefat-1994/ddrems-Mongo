const db = require('./server/config/db');

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10),
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reset_at TIMESTAMP
      );
    `);
    console.log('Table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

run();
