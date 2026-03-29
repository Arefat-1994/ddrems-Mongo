const mysql = require('mysql2/promise');

// Create realistic test images (small colored squares)
const testImages = {
  red: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC',
  blue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksOjmAAAAAElFTkSuQmCC',
  green: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC'
};

async function addTestImages() {
  const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ddrems',
    port: 3307
  });

  console.log('🎨 Adding test images to properties...\n');

  // Get first 3 properties
  const [properties] = await db.query('SELECT id, title FROM properties LIMIT 3');

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const colors = ['red', 'blue', 'green'];
    const color = colors[i % 3];

    // Delete existing images
    await db.query('DELETE FROM property_images WHERE property_id = ?', [property.id]);

    // Add main image
    await db.query(
      'INSERT INTO property_images (property_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [property.id, testImages[color], 'main', 1]
    );

    // Add 2 gallery images
    await db.query(
      'INSERT INTO property_images (property_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [property.id, testImages[color], 'gallery', 1]
    );
    await db.query(
      'INSERT INTO property_images (property_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [property.id, testImages[color], 'gallery', 1]
    );

    console.log(`✓ Added ${color} images to: ${property.title}`);
  }

  // Verify
  console.log('\n📊 Verification:');
  const [result] = await db.query(`
    SELECT p.id, p.title, 
      (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
      (SELECT LEFT(image_url, 30) FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image_preview
    FROM properties p
    WHERE p.id IN (SELECT DISTINCT property_id FROM property_images)
  `);

  result.forEach(r => {
    console.log(`  Property ${r.id}: ${r.title}`);
    console.log(`    Images: ${r.image_count}`);
    console.log(`    Main: ${r.main_image_preview}...`);
  });

  console.log('\n✅ Test images added successfully!');
  console.log('\n💡 Now refresh your browser and check the dashboards.');
  console.log('   Images should display as colored squares.');

  await db.end();
}

addTestImages().catch(console.error);
