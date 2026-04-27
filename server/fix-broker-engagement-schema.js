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

    console.log('--- 🛠️  DDREMS Broker Engagement Schema Migration ---');

    // 1. Add missing audit and payout columns to broker_engagements
    const columnsToAdd = [
      { name: 'payment_submitted_at', type: 'TIMESTAMP' },
      { name: 'payment_verified_at', type: 'TIMESTAMP' },
      { name: 'payment_verified_by', type: 'INTEGER' },
      { name: 'handover_confirmed_at', type: 'TIMESTAMP' },
      { name: 'system_commission_pct', type: 'NUMERIC(5,2)', default: '2.00' },
      { name: 'broker_commission_pct', type: 'NUMERIC(5,2)', default: '2.00' },
      { name: 'system_commission_amount', type: 'NUMERIC(12,2)' },
      { name: 'broker_commission_amount', type: 'NUMERIC(12,2)' },
      { name: 'owner_payout_amount', type: 'NUMERIC(12,2)' },
      { name: 'funds_released_at', type: 'TIMESTAMP' },
      { name: 'funds_released_by', type: 'INTEGER' }
    ];

    for (const col of columnsToAdd) {
      console.log(`Adding column: ${col.name}...`);
      try {
        await client.query(`ALTER TABLE broker_engagements ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} ${col.default ? 'DEFAULT ' + col.default : ''}`);
        console.log(` ✅ ${col.name} added/exists.`);
      } catch (err) {
        console.error(` ❌ Error adding ${col.name}:`, err.message);
      }
    }

    // 2. Re-create the v_broker_engagements view with the new columns
    console.log('\nUpdating v_broker_engagements view...');
    await client.query(`DROP VIEW IF EXISTS v_broker_engagements CASCADE;`);
    await client.query(`
      CREATE VIEW v_broker_engagements AS
      SELECT be.*,
             p.title AS property_title,
             p.location AS property_location,
             p.price AS property_price,
             p.type AS property_type,
             p.listing_type AS property_listing_type,
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
    console.log(' ✅ View updated with all columns from be.*');

    await client.query('COMMIT');
    console.log('\n🎉 Schema migration successful!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
