const db = require('../server/config/db');

async function fixConstraints() {
  const constraintsToFix = [
    { table: 'edit_requests', column: 'user_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'key_requests', column: 'customer_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'key_requests', column: 'owner_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'message_replies', column: 'sender_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'commission_tracking', column: 'broker_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    // Agreement cascade blocks
    { table: 'agreement_transactions', column: 'agreement_request_id', refTable: 'agreement_requests', refCol: 'id', rule: 'CASCADE' },
    { table: 'agreement_signatures', column: 'agreement_request_id', refTable: 'agreement_requests', refCol: 'id', rule: 'CASCADE' },
    { table: 'agreement_commissions', column: 'agreement_request_id', refTable: 'agreement_requests', refCol: 'id', rule: 'CASCADE' },
    { table: 'rental_payment_schedules', column: 'agreement_request_id', refTable: 'agreement_requests', refCol: 'id', rule: 'CASCADE' },
    // Property cascade constraints
    { table: 'property_requests', column: 'owner_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'property_requests', column: 'broker_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'agreements', column: 'customer_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'agreements', column: 'owner_id', refTable: 'users', refCol: 'id', rule: 'CASCADE' },
    { table: 'agreements', column: 'broker_id', refTable: 'users', refCol: 'id', rule: 'SET NULL' },
  ];

  for (const c of constraintsToFix) {
    try {
      // 1. Find the current constraint name
      const queryRes = await db.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = '${c.table}' AND kcu.column_name = '${c.column}' AND tc.constraint_type = 'FOREIGN KEY'
      `);

      const rows = queryRes[0] || [];

      for (let row of rows) {
        const constraintName = row.constraint_name;
        console.log(`Fixing ${constraintName} on ${c.table}...`);
        
        // 2. Drop it
        await db.query(`ALTER TABLE ${c.table} DROP CONSTRAINT ${constraintName}`);
        
        // 3. Add it back with CASCADE
        await db.query(`
          ALTER TABLE ${c.table}
          ADD CONSTRAINT ${constraintName}
          FOREIGN KEY (${c.column})
          REFERENCES ${c.refTable} (${c.refCol})
          ON DELETE ${c.rule}
        `);
        console.log(`  -> Successfully updated to ON DELETE ${c.rule}`);
      }
    } catch (e) {
      console.error(`Error processing ${c.table}.${c.column}:`, e.message);
    }
  }
  process.exit(0);
}

fixConstraints();
