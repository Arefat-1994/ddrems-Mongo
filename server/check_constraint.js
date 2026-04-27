const db = require('./config/db');

(async () => {
  try {
    const [rows] = await db.query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.conname = 'property_documents_document_type_check'
    `);
    
    if (rows && rows.length > 0) {
      console.log('Constraint definition:', rows[0].constraint_def);
    } else {
      console.log('Constraint not found.');
    }
  } catch (error) {
    console.error('Error fetching constraint:', error.message);
  }
  process.exit(0);
})();
