const db = require('../server/config/db');

(async () => {
  try {
    // Check agreement_requests columns
    const [cols] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_requests'"
    );
    console.log('=== agreement_requests columns ===');
    cols.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_workflow_history
    const [cols2] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_workflow_history'"
    );
    console.log('\n=== agreement_workflow_history columns ===');
    cols2.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_notifications
    const [cols3] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_notifications'"
    );
    console.log('\n=== agreement_notifications columns ===');
    cols3.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_documents
    const [cols4] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_documents'"
    );
    console.log('\n=== agreement_documents columns ===');
    cols4.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_payments
    const [cols5] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_payments'"
    );
    console.log('\n=== agreement_payments columns ===');
    cols5.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_signatures
    const [cols6] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_signatures'"
    );
    console.log('\n=== agreement_signatures columns ===');
    cols6.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_transactions
    const [cols7] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_transactions'"
    );
    console.log('\n=== agreement_transactions columns ===');
    cols7.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreement_commissions
    const [cols8] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_commissions'"
    );
    console.log('\n=== agreement_commissions columns ===');
    cols8.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check v_agreement_status view
    const [cols9] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'v_agreement_status'"
    );
    console.log('\n=== v_agreement_status view columns ===');
    cols9.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check agreements table
    const [cols10] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreements'"
    );
    console.log('\n=== agreements table columns ===');
    cols10.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check notifications table
    const [cols11] = await db.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications'"
    );
    console.log('\n=== notifications table columns ===');
    cols11.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // Check properties columns just for listing_type
    const [cols12] = await db.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'properties' AND column_name IN ('listing_type', 'owner_id', 'broker_id', 'price', 'property_admin_id')"
    );
    console.log('\n=== properties relevant columns ===');
    cols12.forEach(c => console.log('  ' + c.column_name));

  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    process.exit();
  }
})();
