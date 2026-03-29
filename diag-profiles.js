const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProfiles() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ddrems',
        port: process.env.DB_PORT || 3307
    });

    console.log('--- Profile Diagnostic ---\n');

    try {
        const profileTypes = ['customer', 'owner', 'broker'];
        for (const type of profileTypes) {
            const table = `${type}_profiles`;
            const [all] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
            const [pending] = await connection.query(`SELECT COUNT(*) as count FROM ${table} WHERE profile_status = 'pending'`);
            const [approved] = await connection.query(`SELECT COUNT(*) as count FROM ${table} WHERE profile_status = 'approved'`);
            const [rejected] = await connection.query(`SELECT COUNT(*) as count FROM ${table} WHERE profile_status = 'rejected'`);
            const [suspended] = await connection.query(`SELECT COUNT(*) as count FROM ${table} WHERE profile_status = 'suspended'`);

            console.log(`${type.toUpperCase()} PROFILES:`);
            console.log(`  Total: ${all[0].count}`);
            console.log(`  Pending: ${pending[0].count}`);
            console.log(`  Approved: ${approved[0].count}`);
            console.log(`  Rejected: ${rejected[0].count}`);
            console.log(`  Suspended: ${suspended[0].count}\n`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkProfiles();
