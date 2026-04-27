/**
 * Migration: Fix Agreement Workflow Schema
 * 
 * This migration adds all missing columns, tables, and views required
 * by the agreement workflow system. It is idempotent — safe to run
 * multiple times.
 */
const db = require('../config/db');

async function run() {
  console.log('🔧 Starting Agreement Schema Migration...\n');

  // ──────────────────────────────────────────────────────────────────
  // 1. Add missing columns to agreement_requests
  // ──────────────────────────────────────────────────────────────────
  const arCols = [
    { name: 'agreement_type',  sql: "ALTER TABLE agreement_requests ADD COLUMN agreement_type VARCHAR(50) DEFAULT 'sale'" },
    { name: 'security_deposit', sql: "ALTER TABLE agreement_requests ADD COLUMN security_deposit NUMERIC(15,2) DEFAULT 0" },
    { name: 'completed_date',   sql: "ALTER TABLE agreement_requests ADD COLUMN completed_date TIMESTAMP" },
  ];

  for (const col of arCols) {
    try {
      const [exists] = await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='agreement_requests' AND column_name=$1",
        [col.name]
      );
      if (exists.length === 0) {
        await db.pool.query(col.sql);
        console.log(`  ✅ Added column agreement_requests.${col.name}`);
      } else {
        console.log(`  ⏭️  Column agreement_requests.${col.name} already exists`);
      }
    } catch (e) {
      console.error(`  ❌ Error adding ${col.name}:`, e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 2. Add missing columns to agreement_payments
  // ──────────────────────────────────────────────────────────────────
  const apCols = [
    { name: 'transaction_reference', sql: "ALTER TABLE agreement_payments ADD COLUMN transaction_reference VARCHAR(255)" },
    { name: 'payment_status',        sql: "ALTER TABLE agreement_payments ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending'" },
    { name: 'verified_by_id',        sql: "ALTER TABLE agreement_payments ADD COLUMN verified_by_id INTEGER" },
    { name: 'verified_date',         sql: "ALTER TABLE agreement_payments ADD COLUMN verified_date TIMESTAMP" },
    { name: 'verification_notes',    sql: "ALTER TABLE agreement_payments ADD COLUMN verification_notes TEXT" },
  ];

  for (const col of apCols) {
    try {
      const [exists] = await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='agreement_payments' AND column_name=$1",
        [col.name]
      );
      if (exists.length === 0) {
        await db.pool.query(col.sql);
        console.log(`  ✅ Added column agreement_payments.${col.name}`);
      } else {
        console.log(`  ⏭️  Column agreement_payments.${col.name} already exists`);
      }
    } catch (e) {
      console.error(`  ❌ Error adding ${col.name}:`, e.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // 3. Add action_date to agreement_workflow_history
  // ──────────────────────────────────────────────────────────────────
  try {
    const [exists] = await db.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name='agreement_workflow_history' AND column_name='action_date'"
    );
    if (exists.length === 0) {
      await db.pool.query("ALTER TABLE agreement_workflow_history ADD COLUMN action_date TIMESTAMP DEFAULT NOW()");
      // Backfill from created_at
      await db.pool.query("UPDATE agreement_workflow_history SET action_date = created_at WHERE action_date IS NULL");
      console.log('  ✅ Added column agreement_workflow_history.action_date');
    } else {
      console.log('  ⏭️  Column agreement_workflow_history.action_date already exists');
    }
  } catch (e) {
    console.error('  ❌ Error adding action_date:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 4. Create agreement_signatures table
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS agreement_signatures (
        id SERIAL PRIMARY KEY,
        agreement_request_id INTEGER REFERENCES agreement_requests(id),
        signer_id INTEGER,
        signer_role VARCHAR(50) NOT NULL,
        signature_data TEXT,
        signed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table agreement_signatures ready');
  } catch (e) {
    console.error('  ❌ Error creating agreement_signatures:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. Create agreement_transactions table
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS agreement_transactions (
        id SERIAL PRIMARY KEY,
        agreement_request_id INTEGER REFERENCES agreement_requests(id),
        transaction_type VARCHAR(50) DEFAULT 'sale',
        transaction_status VARCHAR(50) DEFAULT 'pending',
        buyer_id INTEGER,
        seller_id INTEGER,
        broker_id INTEGER,
        property_id INTEGER,
        transaction_amount NUMERIC(15,2),
        commission_amount NUMERIC(15,2),
        net_amount NUMERIC(15,2),
        completion_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table agreement_transactions ready');
  } catch (e) {
    console.error('  ❌ Error creating agreement_transactions:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 6. Create agreement_commissions table
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS agreement_commissions (
        id SERIAL PRIMARY KEY,
        agreement_request_id INTEGER REFERENCES agreement_requests(id),
        commission_type VARCHAR(50) DEFAULT 'platform',
        recipient_id INTEGER,
        property_price NUMERIC(15,2),
        commission_percentage NUMERIC(5,2),
        commission_amount NUMERIC(15,2),
        payment_status VARCHAR(50) DEFAULT 'pending',
        calculated_by_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table agreement_commissions ready');
  } catch (e) {
    console.error('  ❌ Error creating agreement_commissions:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 7. Create payment_receipts table (used by real-estate-agreement.js)
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS payment_receipts (
        id SERIAL PRIMARY KEY,
        agreement_request_id INTEGER REFERENCES agreement_requests(id),
        payment_method VARCHAR(100),
        payment_amount NUMERIC(15,2),
        receipt_file_path VARCHAR(500),
        verification_status VARCHAR(50) DEFAULT 'pending',
        verification_notes TEXT,
        verified_by_id INTEGER,
        verification_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table payment_receipts ready');
  } catch (e) {
    console.error('  ❌ Error creating payment_receipts:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 8. Create agreement_audit_log table (used by real-estate-agreement.js)
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS agreement_audit_log (
        id SERIAL PRIMARY KEY,
        agreement_request_id INTEGER REFERENCES agreement_requests(id),
        action_type VARCHAR(100),
        action_description TEXT,
        performed_by_id INTEGER,
        old_status VARCHAR(100),
        new_status VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  ✅ Table agreement_audit_log ready');
  } catch (e) {
    console.error('  ❌ Error creating agreement_audit_log:', e.message);
  }

  // ──────────────────────────────────────────────────────────────────
  // 9. Recreate v_agreement_status view with all needed columns
  // ──────────────────────────────────────────────────────────────────
  try {
    await db.pool.query('DROP VIEW IF EXISTS v_agreement_status');
    await db.pool.query(`
      CREATE VIEW v_agreement_status AS
      SELECT 
        ar.id,
        ar.customer_id,
        ar.owner_id,
        ar.property_id,
        ar.broker_id,
        ar.property_admin_id,
        ar.status,
        ar.current_step,
        ar.request_date,
        ar.created_at,
        ar.updated_at,
        ar.proposed_price,
        ar.move_in_date,
        ar.property_price,
        ar.buyer_signed,
        ar.owner_signed,
        ar.broker_signed,
        ar.buyer_signed_date,
        ar.owner_signed_date,
        ar.broker_signed_date,
        ar.payment_submitted,
        ar.payment_verified,
        ar.handover_confirmed,
        ar.funds_released,
        ar.total_commission,
        ar.commission_percentage,
        ar.customer_notes,
        ar.owner_notes,
        ar.admin_notes,
        ar.agreement_type,
        ar.rental_duration_months,
        ar.payment_schedule,
        ar.security_deposit,
        p.title AS property_title,
        p.price AS listed_price,
        p.location AS property_location,
        p.type AS property_type,
        p.listing_type AS property_listing_type,
        c.name AS customer_name,
        c.email AS customer_email,
        o.name AS owner_name,
        o.email AS owner_email,
        adm.name AS admin_name
      FROM agreement_requests ar
      LEFT JOIN properties p ON ar.property_id = p.id
      LEFT JOIN users c ON ar.customer_id = c.id
      LEFT JOIN users o ON ar.owner_id = o.id
      LEFT JOIN users adm ON ar.property_admin_id = adm.id
    `);
    console.log('  ✅ View v_agreement_status recreated with all columns');
  } catch (e) {
    console.error('  ❌ Error recreating view:', e.message);
  }

  console.log('\n🎉 Agreement Schema Migration Complete!\n');
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
