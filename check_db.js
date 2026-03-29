const db = require('./server/config/db');

async function checkTables() {
    try {
        const [tables] = await db.query('SHOW TABLES');
        console.log('--- Tables ---');
        console.log(JSON.stringify(tables, null, 2));
        console.log('--------------');

        // Also check if 'brokers' table exists and has data
        try {
            const [brokers] = await db.query('SELECT * FROM brokers LIMIT 5');
            console.log('--- Brokers Table Data (Sample) ---');
            console.log(JSON.stringify(brokers, null, 2));
        } catch (e) {
            console.log('Brokers table does not exist or error:', e.message);
        }

        // Check broker_profiles
        try {
            const [bp] = await db.query('SELECT * FROM broker_profiles LIMIT 5');
            console.log('--- Broker Profiles Table Data (Sample) ---');
            console.log(JSON.stringify(bp, null, 2));
        } catch (e) {
            console.log('Broker_profiles table does not exist or error:', e.message);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkTables();
