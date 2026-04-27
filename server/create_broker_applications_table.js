const db = require('./config/db');

async function createTable() {
  try {
    console.log('Connecting to database...');
    
    // Create broker_applications table
    await db.query(`
      CREATE TABLE IF NOT EXISTS broker_applications (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone_number VARCHAR(50) NOT NULL,
        id_document VARCHAR(255) NOT NULL,
        license_document VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table broker_applications created successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTable();
