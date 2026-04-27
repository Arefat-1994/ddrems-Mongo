const db = require('./config/db');

(async () => {
  try {
    // Add site_checked and site_inspection_notes to property_verification
    await db.query(`
      ALTER TABLE property_verification 
      ADD COLUMN IF NOT EXISTS site_checked BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Added site_checked column');

    await db.query(`
      ALTER TABLE property_verification 
      ADD COLUMN IF NOT EXISTS site_inspection_notes TEXT
    `);
    console.log('✅ Added site_inspection_notes column');

    console.log('✅ All columns added successfully!');
  } catch (e) {
    console.error('Error:', e.message);
  }
  setTimeout(() => process.exit(), 1000);
})();
