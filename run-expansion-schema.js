const db = require('./server/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Starting System Expansion Migration...');

        const sqlFile = path.join(__dirname, 'database', 'expansion-schema.sql');
        if (!fs.existsSync(sqlFile)) {
            throw new Error(`Migration file not found: ${sqlFile}`);
        }

        let sql = fs.readFileSync(sqlFile, 'utf8');

        // Split by semicolon, but be careful with ENUMs and other complex types
        // Simplified split for this specific migration
        const commands = sql
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0);

        for (const cmd of commands) {
            console.log(`Executing: ${cmd.substring(0, 50)}...`);
            try {
                await db.query(cmd);
            } catch (err) {
                // Ignore "already exists" or "Duplicate column" errors if they happen despite IF NOT EXISTS
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.warn(`⚠️  Warning: ${err.message}`);
                } else {
                    throw err;
                }
            }
        }

        console.log('✅ Migration completed successfully!');

        // Check tables
        const [tables] = await db.query('SHOW TABLES');
        console.log('Current Tables:', tables.map(t => Object.values(t)[0]).join(', '));

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

runMigration();
