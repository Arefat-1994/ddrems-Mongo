const db = require('../config/db');

async function createComplaintsTable() {
  try {
    console.log('Creating complaints table...');
    
    await db.pool.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'other',
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        admin_response TEXT,
        resolved_by INTEGER REFERENCES users(id),
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ complaints table created successfully!');
    
    // Create indexes for performance
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
    `);
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    `);
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
    `);
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
    `);
    
    console.log('✅ Indexes created successfully!');
    console.log('Migration complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

createComplaintsTable();
