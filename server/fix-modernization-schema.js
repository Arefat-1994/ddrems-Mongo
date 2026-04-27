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

    console.log('--- 🛠️  DDREMS Modernization Schema Update (Fixed) ---');

    // 1. Update properties table for 3D and Maps
    console.log('Updating properties table...');
    await client.query(`
      ALTER TABLE properties 
      ADD COLUMN IF NOT EXISTS model_3d_path TEXT,
      ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
      ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
    `);
    console.log(' ✅ Properties table up to date.');

    // 2. Update notifications table
    console.log('Updating notifications table...');
    await client.query(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS link TEXT,
      ADD COLUMN IF NOT EXISTS icon TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB;
    `);
    console.log(' ✅ Notifications table up to date.');

    // 3. Create/Update system_config table
    console.log('Handling system_config table...');
    await client.query(`
      DROP TABLE IF EXISTS system_config CASCADE;
      CREATE TABLE system_config (
        config_key VARCHAR(100) PRIMARY KEY,
        config_value TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO system_config (config_key, config_value) VALUES ('performance_mode', 'normal') ON CONFLICT (config_key) DO UPDATE SET config_value = 'normal';
      INSERT INTO system_config (config_key, config_value) VALUES ('system_status', 'online') ON CONFLICT (config_key) DO UPDATE SET config_value = 'online';
    `);
    console.log(' ✅ System config table ready.');

    // 4. Update the View to include new fields
    console.log('Re-creating v_broker_engagements view...');
    await client.query(`DROP VIEW IF EXISTS v_broker_engagements CASCADE;`);
    await client.query(`
      CREATE VIEW v_broker_engagements AS
      SELECT be.*,
             p.title AS property_title,
             p.location AS property_location,
             p.price AS property_price,
             p.type AS property_type,
             p.listing_type AS property_listing_type,
             p.latitude AS property_latitude,
             p.longitude AS property_longitude,
             p.model_3d_path AS property_3d_model,
             buyer.name AS buyer_name,
             buyer.email AS buyer_email,
             broker.name AS broker_name,
             broker.email AS broker_email,
             owner.name AS owner_name,
             owner.email AS owner_email,
             COALESCE(( SELECT json_agg(bes.signer_role) AS json_agg
                    FROM broker_engagement_signatures bes
                   WHERE bes.engagement_id = be.id), '[]'::json) AS signed_roles
      FROM broker_engagements be
      JOIN properties p ON be.property_id = p.id
      JOIN users buyer ON be.buyer_id = buyer.id
      JOIN users broker ON be.broker_id = broker.id
      JOIN users owner ON be.owner_id = owner.id;
    `);
    console.log(' ✅ View re-created.');

    await client.query('COMMIT');
    console.log('\n🎉 Database modernization complete!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
