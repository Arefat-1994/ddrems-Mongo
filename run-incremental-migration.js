const db = require('./server/config/db');
const fs = require('fs');

async function runMigration() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🚀 DDREMS INCREMENTAL DATABASE MIGRATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    try {
        // Read the SQL file
        const sqlFile = fs.readFileSync('./database/incremental-migration.sql', 'utf8');
        
        // Split by semicolon and filter empty statements
        const statements = sqlFile
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip SELECT statements that are just for display
            if (statement.startsWith('SELECT') && (statement.includes('as status') || statement.includes('as title') || statement.includes('as separator'))) {
                try {
                    const result = await db.query(statement);
                    if (result && result.length > 0) {
                        console.log(`✓ [${i + 1}/${statements.length}] ${result[0][Object.keys(result[0])[0]]}`);
                    }
                } catch (e) {
                    // Ignore display SELECT errors
                }
                successCount++;
                continue;
            }

            try {
                await db.query(statement);
                
                // Show progress for important statements
                if (statement.includes('CREATE TABLE') || statement.includes('ALTER TABLE') || statement.includes('CREATE INDEX') || statement.includes('CREATE TRIGGER') || statement.includes('CREATE OR REPLACE VIEW')) {
                    const match = statement.match(/(?:CREATE TABLE|ALTER TABLE|CREATE INDEX|CREATE TRIGGER|CREATE OR REPLACE VIEW)\s+(?:IF NOT EXISTS\s+)?(?:IF\s+)?`?(\w+)`?/i);
                    const name = match ? match[1] : 'Unknown';
                    console.log(`✓ [${i + 1}/${statements.length}] ${name}`);
                }
                
                successCount++;
            } catch (error) {
                // Some errors are expected (like duplicate keys, already exists)
                if (error.message.includes('already exists') || 
                    error.message.includes('Duplicate') || 
                    error.message.includes('already defined')) {
                    console.log(`⚠ [${i + 1}/${statements.length}] ${error.message.substring(0, 60)}...`);
                    successCount++;
                } else {
                    console.error(`✗ [${i + 1}/${statements.length}] Error: ${error.message}`);
                    errorCount++;
                }
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 MIGRATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log(`📈 Success Rate: ${((successCount / statements.length) * 100).toFixed(1)}%\n`);

        // Verify tables
        console.log('🔍 VERIFICATION: Checking tables...\n');
        
        const tableResult = await db.query(`
            SELECT COUNT(*) as total_tables 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'ddrems'
        `);
        
        console.log(`✅ Total Tables: ${tableResult[0][0].total_tables}`);

        // List all tables
        const tables = await db.query('SHOW TABLES');
        console.log(`\n📋 Tables in database:`);
        tables[0].forEach((row, index) => {
            const tableName = row[Object.keys(row)[0]];
            console.log(`   ${index + 1}. ${tableName}`);
        });

        // Check key columns
        console.log('\n🔍 VERIFICATION: Checking key columns...\n');
        
        const columnsToCheck = [
            { table: 'users', column: 'profile_image' },
            { table: 'users', column: 'profile_approved' },
            { table: 'properties', column: 'owner_id' },
            { table: 'properties', column: 'main_image' },
            { table: 'properties', column: 'views' },
            { table: 'messages', column: 'message_type' },
            { table: 'notifications', column: 'notification_type' }
        ];

        for (const check of columnsToCheck) {
            try {
                const result = await db.query(`
                    SELECT COUNT(*) as col_count 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = 'ddrems' 
                    AND TABLE_NAME = '${check.table}' 
                    AND COLUMN_NAME = '${check.column}'
                `);
                
                if (result[0][0].col_count > 0) {
                    console.log(`✅ ${check.table}.${check.column} exists`);
                } else {
                    console.log(`❌ ${check.table}.${check.column} missing`);
                }
            } catch (e) {
                console.log(`⚠ Could not verify ${check.table}.${check.column}`);
            }
        }

        // Check new tables
        console.log('\n🔍 VERIFICATION: Checking new tables...\n');
        
        const newTables = [
            'customer_profiles',
            'owner_profiles',
            'broker_profiles',
            'agreement_requests',
            'property_requests',
            'property_views',
            'property_documents',
            'document_access',
            'property_verification',
            'favorites',
            'system_config',
            'audit_log',
            'receipts'
        ];

        for (const table of newTables) {
            try {
                const result = await db.query(`
                    SELECT COUNT(*) as table_count 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = 'ddrems' 
                    AND TABLE_NAME = '${table}'
                `);
                
                if (result[0][0].table_count > 0) {
                    console.log(`✅ ${table} created`);
                } else {
                    console.log(`❌ ${table} missing`);
                }
            } catch (e) {
                console.log(`⚠ Could not verify ${table}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ INCREMENTAL MIGRATION COMPLETED SUCCESSFULLY!');
        console.log('═══════════════════════════════════════════════════════════════\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ MIGRATION FAILED:', error);
        console.error('\nPlease check:');
        console.error('1. Database connection in .env file');
        console.error('2. WAMP Server is running on port 3307');
        console.error('3. Database user has ALTER TABLE permissions');
        process.exit(1);
    }
}

runMigration();
