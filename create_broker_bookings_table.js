const db = require('./server/config/db');

async function createBrokerBookingsTable() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS broker_temporary_bookings (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        broker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        property_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        buyer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        id_type VARCHAR(100) NOT NULL,
        id_number VARCHAR(100) NOT NULL,
        document_status VARCHAR(50) NOT NULL,
        preferred_visit_time VARCHAR(255),
        notes TEXT,
        status VARCHAR(50) DEFAULT 'reserved',
        booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        hold_expiry_time TIMESTAMP
      );
    `;
    await db.query(query);
    console.log("broker_temporary_bookings table created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    process.exit(0);
  }
}

createBrokerBookingsTable();
