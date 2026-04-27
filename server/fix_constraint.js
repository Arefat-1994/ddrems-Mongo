const db = require('./config/db');

(async () => {
  try {
    console.log('Updating document_type constraint...');
    
    // First drop the existing constraint
    await db.query(`ALTER TABLE property_documents DROP CONSTRAINT IF EXISTS property_documents_document_type_check`);
    
    console.log('Old constraint dropped.');
    
    // Then add the new one with 'ownership_certificate' included
    await db.query(`
      ALTER TABLE property_documents 
      ADD CONSTRAINT property_documents_document_type_check 
      CHECK (document_type IN ('title_deed', 'survey_plan', 'tax_clearance', 'building_permit', 'ownership_certificate', 'other'))
    `);
    
    console.log('New constraint added successfully with ownership_certificate support.');
  } catch (error) {
    console.error('Error updating constraint:', error.message);
  }
  process.exit(0);
})();
