const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function testConn() {
    console.log('Connecting to:', process.env.DB_HOST, 'on port:', process.env.DB_PORT);
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });
        console.log('✅ Connected to database!');
        const [rows] = await conn.execute('SHOW TABLES');
        console.log('Tables:', rows.map(r => Object.values(r)[0]));
        await conn.end();
        process.exit(0);
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
        process.exit(1);
    }
}

testConn();
