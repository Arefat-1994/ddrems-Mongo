const db = require('./config/db');

(async () => {
  try {
    // Check foreign key constraints on property_documents
    const [fks] = await db.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'property_documents'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    console.log('=== Foreign key constraints on property_documents ===');
    fks.forEach(fk => {
      console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
    });

    // Check if newPropertyId might be undefined - test what the property insert actually returns
    console.log('\n=== Testing property INSERT return value ===');
    const [result] = await db.query(
      `INSERT INTO properties (title, description, price, location, type, status, owner_id, listing_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      ['TEST_DELETE_ME', 'test', 100, 'test', 'apartment', 'pending', null, 'sale']
    );
    console.log('Property INSERT result:', JSON.stringify(result, null, 2));
    
    if (result.insertId) {
      // Now test document insert with this property
      const crypto = require('crypto');
      const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      console.log('\n=== Testing document INSERT with property_id:', result.insertId, '===');
      const [docResult] = await db.query(
        'INSERT INTO property_documents (property_id, document_name, document_path, document_type, access_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [result.insertId, 'test.pdf', 'data:application/pdf;base64,VEVTVApd', 'other', access_key, null]
      );
      console.log('Document INSERT result:', JSON.stringify(docResult, null, 2));
      
      // Clean up
      await db.query('DELETE FROM property_documents WHERE id = ?', [docResult.insertId]);
      await db.query('DELETE FROM properties WHERE id = ?', [result.insertId]);
      console.log('Cleaned up test data.');
    }
  } catch(e) {
    console.error('ERROR:', e.message);
    console.error('Detail:', e.detail);
    console.error('Code:', e.code);
  }
  process.exit(0);
})();
