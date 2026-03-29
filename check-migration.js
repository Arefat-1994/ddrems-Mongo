const db = require('./server/config/db');
async function check() {
    try {
        const [t] = await db.query('SHOW TABLES');
        console.log('Tables:', t.map(r => Object.values(r)[0]).join(', '));
        const [c] = await db.query('SHOW COLUMNS FROM property_documents');
        console.log('Docs Columns:', c.map(col => col.Field).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check();
