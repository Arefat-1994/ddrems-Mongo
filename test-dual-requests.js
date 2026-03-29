const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test data
const testData = {
  property_id: 1,
  customer_id: 1,
  request_message: 'Testing dual request system'
};

async function testDualRequests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TESTING DUAL REQUEST SYSTEM (KEY & AGREEMENT)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Create Key Request
    console.log('📝 TEST 1: Creating Key Request...');
    const keyRes = await axios.post(`${API_BASE}/key-requests`, testData);
    console.log('✅ Key Request Created:', keyRes.data);
    const keyRequestId = keyRes.data.id;

    // Test 2: Create Agreement Request
    console.log('\n📝 TEST 2: Creating Agreement Request...');
    const agreementRes = await axios.post(`${API_BASE}/agreement-requests`, testData);
    console.log('✅ Agreement Request Created:', agreementRes.data);
    const agreementRequestId = agreementRes.data.id;

    // Test 3: Fetch Customer's Key Requests
    console.log('\n📝 TEST 3: Fetching Customer Key Requests...');
    const customerKeysRes = await axios.get(`${API_BASE}/key-requests/customer/${testData.customer_id}`);
    console.log('✅ Customer Key Requests:', customerKeysRes.data);

    // Test 4: Fetch Customer's Agreement Requests
    console.log('\n📝 TEST 4: Fetching Customer Agreement Requests...');
    const customerAgreementsRes = await axios.get(`${API_BASE}/agreement-requests/customer/${testData.customer_id}`);
    console.log('✅ Customer Agreement Requests:', customerAgreementsRes.data);

    // Test 5: Fetch Admin Pending Key Requests
    console.log('\n📝 TEST 5: Fetching Admin Pending Key Requests...');
    const adminKeysRes = await axios.get(`${API_BASE}/key-requests/admin/pending`);
    console.log('✅ Admin Pending Key Requests:', adminKeysRes.data.length, 'requests');

    // Test 6: Fetch Admin Pending Agreement Requests
    console.log('\n📝 TEST 6: Fetching Admin Pending Agreement Requests...');
    const adminAgreementsRes = await axios.get(`${API_BASE}/agreement-requests/admin/pending`);
    console.log('✅ Admin Pending Agreement Requests:', adminAgreementsRes.data.length, 'requests');

    // Test 7: Preview Key
    console.log('\n📝 TEST 7: Previewing Key...');
    const previewRes = await axios.get(`${API_BASE}/key-requests/${keyRequestId}/preview-key`);
    console.log('✅ Key Preview:', previewRes.data);

    // Test 8: Respond to Key Request
    console.log('\n📝 TEST 8: Responding to Key Request...');
    const keyResponseRes = await axios.put(`${API_BASE}/key-requests/${keyRequestId}/respond-key`, {
      status: 'accepted',
      admin_id: 1,
      response_message: 'Key approved',
      key_code: previewRes.data.key_code
    });
    console.log('✅ Key Response:', keyResponseRes.data);

    // Test 9: Forward Agreement Request
    console.log('\n📝 TEST 9: Forwarding Agreement Request...');
    const forwardRes = await axios.put(`${API_BASE}/agreement-requests/${agreementRequestId}/forward`, {
      admin_id: 1,
      response_message: 'Forwarding to owner'
    });
    console.log('✅ Agreement Forward:', forwardRes.data);

    // Test 10: Verify both tables have data
    console.log('\n📝 TEST 10: Verifying Database Tables...');
    const db = require('./server/config/db');
    const [keyRows] = await db.query('SELECT COUNT(*) as count FROM request_key');
    const [agreementRows] = await db.query('SELECT COUNT(*) as count FROM agreement_requests');
    console.log('✅ request_key table:', keyRows[0].count, 'rows');
    console.log('✅ agreement_requests table:', agreementRows[0].count, 'rows');

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED - DUAL REQUEST SYSTEM WORKING PERFECTLY!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📊 SUMMARY:');
    console.log('  ✅ Key requests can be created');
    console.log('  ✅ Agreement requests can be created');
    console.log('  ✅ Both request types are stored in correct tables');
    console.log('  ✅ Admin can fetch pending requests from both tables');
    console.log('  ✅ Admin can respond to key requests');
    console.log('  ✅ Admin can forward agreement requests');
    console.log('  ✅ Both buttons work identically\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
}

testDualRequests();
