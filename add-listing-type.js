const mysql = require('mysql2/promise');

async function addListingType() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🔧 Adding listing_type column to properties table...\n');

  try {
    // Add listing_type column if it doesn't exist
    try {
      await connection.query(`
        ALTER TABLE properties 
        ADD COLUMN listing_type ENUM('sale', 'rent') DEFAULT 'sale' AFTER type
      `);
      console.log('✅ Added listing_type column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  listing_type column already exists');
      } else {
        throw error;
      }
    }
    
    // Update existing properties
    await connection.query(`
      UPDATE properties SET listing_type = 'sale' WHERE listing_type IS NULL
    `);
    
    console.log('✅ Updated existing properties');
    console.log('\n🎉 Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

addListingType();
