const db = require('../config/db');

async function up() {
  console.log('🔄 Updating v_agreement_status view...');

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
        ar.counter_offer_price,
        ar.system_fee_payer,
        ar.negotiation_rounds,
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
        ar.buyer_handover_confirmed,
        ar.owner_handover_confirmed,
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
        ar.is_direct_agreement,
        ar.completed_date,
        p.title AS property_title,
        p.price AS listed_price,
        p.location AS property_location,
        p.type AS property_type,
        p.listing_type AS property_listing_type,
        p.latitude AS property_latitude,
        p.longitude AS property_longitude,
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
    console.log('  ✅ View v_agreement_status updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('  ❌ Error updating view:', err.message);
    process.exit(1);
  }
}

up();
