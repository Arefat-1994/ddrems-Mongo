const db = require('../server/config/db.js');

async function migrate() {
  try {
    console.log('Starting migration...');
    
    // Create property_images table
    await db.query(`
      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_type VARCHAR(50) DEFAULT 'gallery'
          CHECK (image_type IN ('main', 'gallery', 'plan')),
        uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.query('CREATE INDEX IF NOT EXISTS idx_pi_property ON property_images(property_id)');
    
    console.log('✅ property_images table created or verified successfully');
    
    // Check if property_verification exists (I checked it earlier, but just in case)
    await db.query(`
      CREATE TABLE IF NOT EXISTS property_verification (
        id SERIAL PRIMARY KEY,
        property_id INT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        verification_status VARCHAR(50) DEFAULT 'pending'
          CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
        verification_notes TEXT NULL,
        verified_by INT REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ property_verification table verified');
    
  } catch (err) {
    console.error('❌ Migration Error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
