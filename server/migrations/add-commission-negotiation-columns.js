/**
 * Migration: Add commission negotiation columns to broker_engagements
 * and video_url to properties
 */
const db = require('../config/db');

async function up() {
  console.log('🔄 Running migration: add-commission-negotiation-columns...');

  // 1. Add commission negotiation columns to broker_engagements
  const columnsToAdd = [
    { name: 'buyer_commission_offer', sql: 'ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS buyer_commission_offer NUMERIC(5,2)' },
    { name: 'broker_commission_counter', sql: 'ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS broker_commission_counter NUMERIC(5,2)' },
    { name: 'agreed_commission_pct', sql: 'ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS agreed_commission_pct NUMERIC(5,2)' },
    { name: 'commission_negotiation_status', sql: "ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS commission_negotiation_status VARCHAR(50) DEFAULT 'pending'" },
    { name: 'system_fee_payer', sql: "ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS system_fee_payer VARCHAR(20) DEFAULT 'buyer'" },
  ];

  for (const col of columnsToAdd) {
    try {
      await db.pool.query(col.sql);
      console.log(`  ✅ Added column: ${col.name}`);
    } catch (err) {
      if (err.code === '42701') {
        console.log(`  ⏭️ Column ${col.name} already exists, skipping`);
      } else {
        console.error(`  ❌ Error adding ${col.name}:`, err.message);
      }
    }
  }

  // 2. Add video_url to properties
  try {
    await db.pool.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS video_url TEXT');
    console.log('  ✅ Added column: properties.video_url');
  } catch (err) {
    if (err.code === '42701') {
      console.log('  ⏭️ Column video_url already exists in properties');
    } else {
      console.error('  ❌ Error adding video_url:', err.message);
    }
  }

  // 3. Update the v_broker_engagements view to include new columns
  try {
    await db.pool.query(`
      CREATE OR REPLACE VIEW v_broker_engagements AS
      SELECT 
        be.*,
        p.title AS property_title,
        p.location AS property_location,
        p.price AS property_price,
        p.type AS property_type,
        p.listing_type AS property_listing_type,
        p.latitude AS property_latitude,
        p.longitude AS property_longitude,
        p.model_3d_path AS property_3d_model,
        p.video_url AS property_video_url,
        p.images AS property_images,
        buyer.name AS buyer_name,
        buyer.email AS buyer_email,
        broker.name AS broker_name,
        broker.email AS broker_email,
        owner.name AS owner_name,
        owner.email AS owner_email,
        COALESCE(
          (SELECT STRING_AGG(bes.signer_role, ',') 
           FROM broker_engagement_signatures bes 
           WHERE bes.engagement_id = be.id), ''
        ) AS signed_roles
      FROM broker_engagements be
      LEFT JOIN properties p ON be.property_id = p.id
      LEFT JOIN users buyer ON be.buyer_id = buyer.id
      LEFT JOIN users broker ON be.broker_id = broker.id
      LEFT JOIN users owner ON be.owner_id = owner.id
    `);
    console.log('  ✅ Updated v_broker_engagements view');
  } catch (err) {
    console.error('  ❌ Error updating view:', err.message);
  }

  console.log('✅ Migration complete!');
}

up().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
