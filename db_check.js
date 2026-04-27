const db = require('./server/config/db');
async function run() {
  try {
    // Drop and recreate the view to handle new columns
    await db.pool.query('DROP VIEW IF EXISTS v_broker_engagements');
    await db.pool.query(`
      CREATE VIEW v_broker_engagements AS
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
    console.log('✅ View recreated successfully');
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}
run();
