/**
 * DDREMS Enhancement Migration Script
 * Adds latitude/longitude columns and ensures all required tables exist
 */
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
    console.log('🚀 Starting DDREMS Enhancement Migration...\n');

    // 1. Add latitude/longitude to properties
    console.log('📍 Phase 1: Adding latitude/longitude to properties...');
    try {
      await client.query(`
        ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
      `);
      console.log('   ✅ latitude/longitude columns added');
    } catch (e) {
      console.log('   ⚠️ Columns may already exist:', e.message);
    }

    // 2. Ensure notifications table exists
    console.log('🔔 Phase 2: Ensuring notifications table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ notifications table ready');
    } catch (e) {
      console.log('   ⚠️ notifications:', e.message);
    }

    // 3. Ensure request_key table exists
    console.log('🔑 Phase 3: Ensuring request_key table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS request_key (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'pending',
          key_code VARCHAR(100),
          request_message TEXT,
          response_message TEXT,
          admin_id INTEGER,
          responded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ request_key table ready');
    } catch (e) {
      console.log('   ⚠️ request_key:', e.message);
    }

    // 4. Ensure agreement_requests table exists
    console.log('🤝 Phase 4: Ensuring agreement_requests table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS agreement_requests (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          customer_id INTEGER,
          broker_id INTEGER,
          status VARCHAR(50) DEFAULT 'pending',
          request_message TEXT,
          response_message TEXT,
          responded_by INTEGER,
          forwarded_to_owner BOOLEAN DEFAULT FALSE,
          admin_id INTEGER,
          responded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ agreement_requests table ready');
    } catch (e) {
      console.log('   ⚠️ agreement_requests:', e.message);
    }

    // 5. Ensure property_verification table exists
    console.log('✅ Phase 5: Ensuring property_verification table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS property_verification (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          verification_status VARCHAR(50) DEFAULT 'pending',
          verification_notes TEXT,
          verified_by INTEGER,
          verified_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ property_verification table ready');
    } catch (e) {
      console.log('   ⚠️ property_verification:', e.message);
    }

    // 6. Ensure property_images table exists
    console.log('📷 Phase 6: Ensuring property_images table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS property_images (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          image_type VARCHAR(50) DEFAULT 'gallery',
          uploaded_by INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ property_images table ready');
    } catch (e) {
      console.log('   ⚠️ property_images:', e.message);
    }

    // 7. Ensure property_documents table exists
    console.log('📄 Phase 7: Ensuring property_documents table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS property_documents (
          id SERIAL PRIMARY KEY,
          property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
          document_name VARCHAR(255),
          document_url TEXT,
          document_type VARCHAR(100),
          access_key VARCHAR(100),
          is_locked BOOLEAN DEFAULT FALSE,
          uploaded_by INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ property_documents table ready');
    } catch (e) {
      console.log('   ⚠️ property_documents:', e.message);
    }

    // 8. Ensure profile_edit_requests table exists
    console.log('✏️ Phase 8: Ensuring profile_edit_requests table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS profile_edit_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          admin_response TEXT,
          responded_by INTEGER,
          responded_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ profile_edit_requests table ready');
    } catch (e) {
      console.log('   ⚠️ profile_edit_requests:', e.message);
    }

    // 9. Add main_image column to properties if missing
    console.log('🖼️ Phase 9: Ensuring main_image column...');
    try {
      await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS main_image TEXT`);
      console.log('   ✅ main_image column ready');
    } catch (e) {
      console.log('   ⚠️ main_image:', e.message);
    }

    // 10. Add verified column to properties if missing
    console.log('✅ Phase 10: Ensuring verified column...');
    try {
      await client.query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE`);
      console.log('   ✅ verified column ready');
    } catch (e) {
      console.log('   ⚠️ verified:', e.message);
    }

    console.log('\n🎉 Migration complete!\n');
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
