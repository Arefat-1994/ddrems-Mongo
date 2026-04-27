const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function migrate() {
  try {
    console.log('🚀 Starting Database Migration: Settings Enhancements');

    // 1. Create user_sessions table
    console.log('--- Creating user_sessions table ---');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_type VARCHAR(50),
        location VARCHAR(100),
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Add columns to user_preferences
    console.log('--- Enhancing user_preferences columns ---');
    const columnsToAdd = [
      { name: 'wrong_password_alerts', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'unauthorized_access_alerts', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'suspicious_activity_alerts', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'sound_notifications', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'pending_request_notifications', type: 'BOOLEAN DEFAULT TRUE' }
    ];

    for (const col of columnsToAdd) {
      const checkCol = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_preferences' AND column_name = $1
      `, [col.name]);

      if (checkCol.rows.length === 0) {
        console.log(`Adding column: ${col.name}`);
        await pool.query(`ALTER TABLE user_preferences ADD COLUMN ${col.name} ${col.type}`);
      } else {
        console.log(`Column already exists: ${col.name}`);
      }
    }

    // 3. Ensure audit_log has IP and User Agent
    console.log('--- Verifying audit_log structure ---');
    const auditCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log' AND column_name = 'user_agent'
    `);
    if (auditCols.rows.length === 0) {
      console.log('Adding user_agent to audit_log');
      await pool.query('ALTER TABLE audit_log ADD COLUMN user_agent TEXT');
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
