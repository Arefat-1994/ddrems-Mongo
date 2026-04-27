const db = require('./config/db');

async function checkNotificationsTable() {
    try {
        const [columns] = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'notifications'
            ORDER BY ordinal_position;
        `);
        console.log('=== notifications table columns ===');
        columns.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} (Nullable: ${col.is_nullable})`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkNotificationsTable();
