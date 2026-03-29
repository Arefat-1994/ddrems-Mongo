const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function testImageUpload() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🧪 Testing Image Upload System...\n');

  // Create a simple test image (1x1 red pixel PNG in base64)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  // Get a property to test with
  const [properties] = await db.query('SELECT id FROM properties LIMIT 1');
  
  if (properties.length === 0) {
    console.log('❌ No properties found. Please add a property first.');
    await db.end();
    return;
  }

  const propertyId = properties[0].id;
  console.log(`✓ Using property ID: ${propertyId}`);

  // Delete old test images
  await db.query('DELETE FROM property_images WHERE property_id = ?', [propertyId]);
  console.log('✓ Cleaned old images');

  // Insert test image
  await db.query(
    'INSERT INTO property_images (property_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)',
    [propertyId, testImageBase64, 'main', 1]
  );
  console.log('✓ Inserted test image (base64)');

  // Verify
  const [images] = await db.query(
    'SELECT id, property_id, image_type, LENGTH(image_url) as size FROM property_images WHERE property_id = ?',
    [propertyId]
  );

  console.log('\n📊 Images in database:');
  images.forEach(img => {
    console.log(`  - ID: ${img.id}, Type: ${img.image_type}, Size: ${img.size} bytes`);
  });

  // Test the properties query with image
  const [propsWithImages] = await db.query(`
    SELECT p.id, p.title,
      (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
    FROM properties p
    WHERE p.id = ?
  `, [propertyId]);

  console.log('\n📋 Property with image data:');
  if (propsWithImages.length > 0) {
    const prop = propsWithImages[0];
    console.log(`  - Title: ${prop.title}`);
    console.log(`  - Image Count: ${prop.image_count}`);
    console.log(`  - Main Image: ${prop.main_image ? prop.main_image.substring(0, 50) + '...' : 'None'}`);
  }

  console.log('\n✅ Test complete!');
  console.log('\n💡 Now refresh your browser and check if images display.');
  
  await db.end();
}

testImageUpload().catch(console.error);
