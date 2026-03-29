const mysql = require('mysql2/promise');

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'ddrems',
        port: 3307
    });

    try {
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables in ddrems:', JSON.stringify(tables, null, 2));

        const tablesToCheck = ['messages', 'users', 'profiles', 'properties', 'agreements', 'announcements', 'document_access'];
        for (const table of tablesToCheck) {
            try {
                const [cols] = await connection.query(`DESCRIBE ${table}`);
                console.log(`\nColumns in ${table}:`);
                cols.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
            } catch (e) {
                console.log(`\nTable ${table} not found or error:`, e.message);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkSchema();
