const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'ddrems',
        port: 3307
    });

    try {
        const [columns] = await connection.query('SHOW COLUMNS FROM brokers');
        console.log('BROKERS COLUMNS:', JSON.stringify(columns, null, 2));

        const [propertyColumns] = await connection.query('SHOW COLUMNS FROM properties');
        console.log('PROPERTIES COLUMNS:', JSON.stringify(propertyColumns, null, 2));

        const [usersColumns] = await connection.query('SHOW COLUMNS FROM users');
        console.log('USERS COLUMNS:', JSON.stringify(usersColumns, null, 2));

        const [sampleBrokers] = await connection.query('SELECT * FROM brokers LIMIT 10');
        console.log('SAMPLE BROKERS:', JSON.stringify(sampleBrokers, null, 2));

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await connection.end();
    }
}

check();
