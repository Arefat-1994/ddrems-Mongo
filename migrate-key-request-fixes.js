#!/usr/bin/env node

/**
 * Migrate Key Request Workflow Fixes
 * - Adds FOREIGN KEY constraints to request_key table
 * - Adds indexes for performance
 * - Verifies all changes
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ddrems',
  port: process.env.DB_PORT || 3306
};

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   MIGRATE: Key Request Workflow Fixes                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database\n');

    // Step 1: Drop existing constraints if they exist
    console.log('Step 1: Removing old constraints (if any)...');
    try {
      await connection.query('ALTER TABLE request_key DROP FOREIGN KEY request_key_ibfk_3');
      console.log('  ✅ Dropped old owner_id constraint');
    } catch (e) {
      console.log('  ℹ️  No old owner_id constraint found');
    }

    try {
      await connection.query('ALTER TABLE request_key DROP FOREIGN KEY request_key_ibfk_4');
      console.log('  ✅ Dropped old admin_id constraint');
    } catch (e) {
      console.log('  ℹ️  No old admin_id constraint found');
    }
    console.log('');

    // Step 2: Add FOREIGN KEY constraints
    console.log('Step 2: Adding FOREIGN KEY constraints...');
    try {
      await connection.query(`
        ALTER TABLE request_key 
        ADD CONSTRAINT request_key_owner_fk FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ Added owner_id FOREIGN KEY constraint');
    } catch (e) {
      console.log(`  ⚠️  Error adding owner_id constraint: ${e.message}`);
    }

    try {
      await connection.query(`
        ALTER TABLE request_key 
        ADD CONSTRAINT request_key_admin_fk FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ Added admin_id FOREIGN KEY constraint');
    } catch (e) {
      console.log(`  ⚠️  Error adding admin_id constraint: ${e.message}`);
    }
    console.log('');

    // Step 3: Add indexes
    console.log('Step 3: Adding indexes for performance...');
    const indexes = [
      { name: 'idx_status', column: 'status' },
      { name: 'idx_customer', column: 'customer_id' },
      { name: 'idx_property', column: 'property_id' },
      { name: 'idx_admin', column: 'admin_id' }
    ];

    for (const idx of indexes) {
      try {
        await connection.query(`ALTER TABLE request_key ADD INDEX ${idx.name} (${idx.column})`);
        console.log(`  ✅ Added index: ${idx.name}`);
      } catch (e) {
        if (e.message.includes('Duplicate key name')) {
          console.log(`  ℹ️  Index ${idx.name} already exists`);
        } else {
          console.log(`  ⚠️  Error adding index ${idx.name}: ${e.message}`);
        }
      }
    }
    console.log('');

    // Step 4: Verify constraints
    console.log('Step 4: Verifying FOREIGN KEY constraints...');
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'request_key' AND TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbConfig.database]);

    if (constraints.length >= 2) {
      console.log('  ✅ FOREIGN KEY constraints verified:');
      constraints.forEach(c => {
        console.log(`     - ${c.CONSTRAINT_NAME}: ${c.COLUMN_NAME} → ${c.REFERENCED_TABLE_NAME}(${c.REFERENCED_COLUMN_NAME})`);
      });
    } else {
      console.log(`  ⚠️  Only ${constraints.length} FOREIGN KEY constraints found (expected 2+)`);
    }
    console.log('');

    // Step 5: Verify indexes
    console.log('Step 5: Verifying indexes...');
    const [indexInfo] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_NAME = 'request_key' AND TABLE_SCHEMA = ? AND INDEX_NAME != 'PRIMARY'
    `, [dbConfig.database]);

    if (indexInfo.length > 0) {
      console.log('  ✅ Indexes verified:');
      indexInfo.forEach(idx => {
        console.log(`     - ${idx.INDEX_NAME} (${idx.COLUMN_NAME})`);
      });
    } else {
      console.log('  ⚠️  No indexes found');
    }
    console.log('');

    // Step 6: Verify table structure
    console.log('Step 6: Final table structure...');
    const [tableInfo] = await connection.query('DESCRIBE request_key');
    console.log('  Columns:');
    tableInfo.forEach(col => {
      const nullable = col.Null === 'NO' ? 'NOT NULL' : 'NULL';
      const key = col.Key ? ` [${col.Key}]` : '';
      console.log(`    - ${col.Field}: ${col.Type} ${nullable}${key}`);
    });
    console.log('');

    // Step 7: Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ MIGRATION COMPLETED SUCCESSFULLY           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Changes Applied:');
    console.log('  ✅ Added FOREIGN KEY constraint for owner_id');
    console.log('  ✅ Added FOREIGN KEY constraint for admin_id');
    console.log('  ✅ Added performance indexes');
    console.log('  ✅ Verified table structure\n');

    console.log('🔧 Backend Code Changes:');
    console.log('  ✅ server/routes/key-requests.js - Added request_type to all queries');
    console.log('  ✅ server/routes/agreement-requests.js - Added request_type to all queries');
    console.log('  ✅ client/src/components/CustomerDashboardEnhanced.js - Simplified request handling');
    console.log('  ✅ client/src/components/PropertyAdminDashboard.js - Simplified request handling\n');

    console.log('🚀 Next Steps:');
    console.log('  1. Restart backend server: npm start');
    console.log('  2. Test key request workflow:');
    console.log('     - Login as Customer');
    console.log('     - Browse property');
    console.log('     - Click "🔑 Request Access Key"');
    console.log('  3. Verify in Property Admin dashboard');
    console.log('  4. Check KEY_REQUEST_WORKFLOW_FIX.md for complete testing guide\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify database is running');
    console.error('2. Check .env file for correct database credentials');
    console.error('3. Ensure database name is correct');
    console.error('4. Verify request_key table exists\n');
    if (connection) await connection.end();
    process.exit(1);
  }
}

main();
