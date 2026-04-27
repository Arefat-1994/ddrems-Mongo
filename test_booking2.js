const db = require('./server/config/db');
(async () => {
  try {
    const [rows] = await db.query('SELECT id FROM properties LIMIT 1');
    if (!rows.length) { console.log('No properties'); return; }
    const property_id = rows[0].id;
    const broker_id = 1; 
    const property_admin_id = null;
    const buyer_name = 'Test Buyer';
    const phone = '0911123456';
    const id_type = 'National ID';
    const id_number = '123456';
    const document_status = 'Yes';
    const preferred_visit_time = '2026-05-01T10:00';
    const notes = 'Test notes';

    const [result] = await db.query(
      `INSERT INTO broker_temporary_bookings 
        (property_id, broker_id, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes, hold_expiry_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + interval '30 minutes') RETURNING id, hold_expiry_time`,
      [property_id, broker_id, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes]
    );
    console.log('Success:', result);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
})();
