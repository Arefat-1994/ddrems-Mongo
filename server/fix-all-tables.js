const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fix property_documents.document_path to TEXT for base64 storage
    console.log('1. Fixing property_documents.document_path to TEXT...');
    await client.query(`ALTER TABLE property_documents ALTER COLUMN document_path TYPE TEXT`);
    console.log('   ✅ Done');

    // 2. Create edit_requests table
    console.log('2. Creating edit_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS edit_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        request_type VARCHAR(50) DEFAULT 'profile',
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        admin_response TEXT,
        admin_id INTEGER,
        requested_fields JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);
    console.log('   ✅ Done');

    // 3. Create key_requests table
    console.log('3. Creating key_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS key_requests (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id),
        property_id INTEGER REFERENCES properties(id),
        owner_id INTEGER,
        broker_id INTEGER,
        admin_id INTEGER,
        document_id INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        access_key VARCHAR(50),
        request_message TEXT,
        response_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);
    console.log('   ✅ Done');

    // 4. Create message_recipients table if missing
    console.log('4. Creating message_recipients table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_recipients (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ Done');

    // 5. Create message_replies table if missing
    console.log('5. Creating message_replies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS message_replies (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id),
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ Done');

    // 6. Create notifications table if missing important columns
    console.log('6. Checking notifications table...');
    const notifCheck = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'
    `);
    const notifCols = notifCheck.rows.map(r => r.column_name);
    
    if (!notifCols.includes('related_id')) {
      await client.query(`ALTER TABLE notifications ADD COLUMN related_id INTEGER`);
      console.log('   Added related_id');
    }
    if (!notifCols.includes('link')) {
      await client.query(`ALTER TABLE notifications ADD COLUMN link VARCHAR(255)`);
      console.log('   Added link');
    }
    console.log('   ✅ Done');

    // 7. Create agreement_requests table if missing
    console.log('7. Creating agreement_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS agreement_requests (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES users(id),
        property_id INTEGER REFERENCES properties(id),
        owner_id INTEGER,
        broker_id INTEGER,
        admin_id INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        request_message TEXT,
        response_message TEXT,
        monthly_rent NUMERIC(12,2),
        duration_months INTEGER DEFAULT 12,
        start_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ Done');

    // 8. Make sure user_two_factor_settings table exists
    console.log('8. Creating user_two_factor_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_two_factor_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        is_enabled BOOLEAN DEFAULT FALSE,
        method VARCHAR(20) DEFAULT 'otp',
        otp_secret VARCHAR(255),
        otp_verified BOOLEAN DEFAULT FALSE,
        password_hash VARCHAR(255),
        captcha_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('   ✅ Done');

    await client.query('COMMIT');
    console.log('\n🎉 All migrations applied successfully!');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration error:', e.message);
    // If ALTER fails because column already TEXT, that's fine
    if (e.message.includes('already')) {
      console.log('(Some items may already exist - this is OK)');
    }
  } finally {
    client.release();
    pool.end();
  }
}
migrate();
