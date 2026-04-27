const db = require('../config/db');

(async () => {
  try {
    console.log('🚀 Starting Site Check & Legal Verification migration...\n');

    // 1. site_checks table
    await db.query(`
      CREATE TABLE IF NOT EXISTS site_checks (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        inspector_id INTEGER NOT NULL REFERENCES users(id),
        inspector_gps_lat DECIMAL(10, 8),
        inspector_gps_lng DECIMAL(11, 8),
        property_lat DECIMAL(10, 8),
        property_lng DECIMAL(11, 8),
        distance_meters DECIMAL(10, 2),
        within_radius BOOLEAN DEFAULT FALSE,
        photo_url TEXT,
        photo_timestamp TIMESTAMP DEFAULT NOW(),
        status VARCHAR(30) DEFAULT 'pending',
        admin_comment TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created site_checks table');

    // 2. legal_documents table
    await db.query(`
      CREATE TABLE IF NOT EXISTS legal_documents (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        uploaded_by INTEGER NOT NULL REFERENCES users(id),
        document_type VARCHAR(50) NOT NULL,
        document_url TEXT NOT NULL,
        original_filename TEXT,
        status VARCHAR(30) DEFAULT 'pending',
        admin_comment TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created legal_documents table');

    // 3. verification_audit_log table
    await db.query(`
      CREATE TABLE IF NOT EXISTS verification_audit_log (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        performed_by INTEGER REFERENCES users(id),
        performer_role VARCHAR(50),
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created verification_audit_log table');

    // 4. Add indexes for performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_site_checks_property ON site_checks(property_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_site_checks_status ON site_checks(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_site_checks_inspector ON site_checks(inspector_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_legal_docs_property ON legal_documents(property_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_legal_docs_status ON legal_documents(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_audit_log_property ON verification_audit_log(property_id)`);
    console.log('✅ Created indexes');

    console.log('\n🎉 Site Check & Legal Verification migration completed successfully!');
  } catch (e) {
    console.error('❌ Migration error:', e.message);
  }
  setTimeout(() => process.exit(), 1000);
})();
