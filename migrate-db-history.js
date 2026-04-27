const db = require('./server/config/db');
async function migrate() {
  try {
    console.log('Starting migration for history table...');
    const q = `CREATE TABLE IF NOT EXISTS agreement_workflow_history (
      id SERIAL PRIMARY KEY,
      agreement_request_id INTEGER NOT NULL,
      step_number INTEGER,
      step_name VARCHAR(100),
      action VARCHAR(100),
      action_by_id INTEGER,
      previous_status VARCHAR(100),
      new_status VARCHAR(100),
      notes TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    await db.query(q);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
migrate();
