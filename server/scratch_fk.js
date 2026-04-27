const db = require('../server/config/db');
(async () => {
  try {
    const res = await db.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name IN ('users', 'agreement_requests', 'properties');
    `);
    console.log(JSON.stringify(res.rows || res[0], null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
