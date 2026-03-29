// Run the fix-schema.sql migration using Node.js
const db = require('./server/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('=== Running DDREMS Schema Fix Migration ===\n');

    const sqlFile = fs.readFileSync(path.join(__dirname, 'database', 'fix-schema.sql'), 'utf8');

    // Split by semicolons, filter out comments and empty statements
    const statements = sqlFile
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const shortDesc = stmt.substring(0, 80).replace(/\n/g, ' ').replace(/\r/g, '');

        try {
            await db.query(stmt);
            successCount++;
            console.log(`  ✅ [${i + 1}/${statements.length}] ${shortDesc}...`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_ENTRY') {
                skipCount++;
                console.log(`  ⏭️ [${i + 1}/${statements.length}] Already exists, skipped: ${shortDesc}...`);
            } else {
                errorCount++;
                console.log(`  ❌ [${i + 1}/${statements.length}] Error: ${error.message}`);
                console.log(`     Statement: ${shortDesc}...`);
            }
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ⏭️ Skipped: ${skipCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);

    // Verify tables exist
    console.log('\n=== Verifying Tables ===');
    const tables = ['properties', 'property_images', 'property_verification', 'property_documents', 'document_access_requests', 'users'];
    for (const table of tables) {
        try {
            const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`  ✅ ${table}: ${rows[0].count} rows`);
        } catch (error) {
            console.log(`  ❌ ${table}: ${error.message}`);
        }
    }

    // Verify properties columns
    console.log('\n=== Verifying Properties Columns ===');
    try {
        const [cols] = await db.query(`SHOW COLUMNS FROM properties`);
        const colNames = cols.map(c => c.Field);
        const requiredCols = ['listing_type', 'owner_id', 'views', 'favorites', 'address', 'city', 'state', 'zip_code', 'features'];
        for (const col of requiredCols) {
            if (colNames.includes(col)) {
                console.log(`  ✅ Column '${col}' exists`);
            } else {
                console.log(`  ❌ Column '${col}' MISSING`);
            }
        }
        // Check status enum
        const statusCol = cols.find(c => c.Field === 'status');
        console.log(`  ℹ️ status ENUM: ${statusCol.Type}`);
    } catch (error) {
        console.log(`  ❌ Error checking columns: ${error.message}`);
    }

    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
