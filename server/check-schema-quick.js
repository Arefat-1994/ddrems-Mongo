const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

async function check() {
  try {
    // Check property_documents
    const r1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_documents' ORDER BY ordinal_position");
    console.log('\n=== property_documents ===');
    r1.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
    
    // Check property_images
    const r2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_images' ORDER BY ordinal_position");
    console.log('\n=== property_images ===');
    r2.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check messages
    const r3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position");
    console.log('\n=== messages ===');
    r3.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check edit_requests  
    const r4 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'edit_requests' ORDER BY ordinal_position");
    console.log('\n=== edit_requests ===');
    r4.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check property_verification
    const r5 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_verification' ORDER BY ordinal_position");
    console.log('\n=== property_verification ===');
    r5.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check key_requests
    const r6 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'key_requests' ORDER BY ordinal_position");
    console.log('\n=== key_requests ===');
    r6.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Quick test: can we insert a property?
    console.log('\n=== Quick connectivity test ===');
    const r7 = await pool.query("SELECT COUNT(*) as cnt FROM properties");
    console.log(`  Properties count: ${r7.rows[0].cnt}`);
    const r8 = await pool.query("SELECT COUNT(*) as cnt FROM users");
    console.log(`  Users count: ${r8.rows[0].cnt}`);
    
  } catch(e) {
    console.error('Error:', e.message);
  }
  pool.end();
}
check();
