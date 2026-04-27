const axios = require('axios');
const API = 'http://localhost:5000/api';

async function test() {
  console.log('=== TESTING AGREEMENT WORKFLOW ===\n');

  let customerId, propertyId;
  
  // 1. Find a customer user
  try {
    const usersRes = await axios.get(`${API}/users`);
    const users = usersRes.data;
    const customer = users.find(u => u.role === 'user' || u.role === 'customer');
    if (!customer) { console.error('❌ No customer user found'); return; }
    customerId = customer.id;
    console.log(`✅ Found customer: ${customer.name} (ID: ${customerId})`);
  } catch (e) {
    console.error('❌ Error finding customer:', e.response?.data?.message || e.message);
    return;
  }

  // 2. Find a property WITH an owner_id set
  try {
    const db = require('../server/config/db');
    const [props] = await db.query(
      "SELECT id, title, owner_id, price FROM properties WHERE owner_id IS NOT NULL AND status = 'approved' LIMIT 1"
    );
    if (props.length === 0) {
      // Try any property with owner
      const [props2] = await db.query("SELECT id, title, owner_id, price FROM properties WHERE owner_id IS NOT NULL LIMIT 1");
      if (props2.length === 0) {
        console.error('❌ No properties with owner found');
        process.exit(1);
      }
      propertyId = props2[0].id;
      console.log(`✅ Using property: ${props2[0].title} (ID: ${propertyId}, Owner: ${props2[0].owner_id})`);
    } else {
      propertyId = props[0].id;
      console.log(`✅ Using property: ${props[0].title} (ID: ${propertyId}, Owner: ${props[0].owner_id})`);
    }
  } catch (e) {
    console.error('❌ Error finding property:', e.message);
    process.exit(1);
  }

  // 3. TEST: Create agreement request
  console.log('\n--- Test 1: Create Agreement Request ---');
  let agreementId;
  try {
    const res = await axios.post(`${API}/agreement-workflow/request`, {
      customer_id: customerId,
      property_id: propertyId,
      proposed_price: 75000000,
      move_in_date: '2026-04-15',
      customer_notes: 'Test agreement request',
      agreement_type: 'sale'
    });
    console.log(`✅ SUCCESS: ${res.data.message}`);
    console.log(`   Agreement ID: ${res.data.agreement_id}, Status: ${res.data.status}`);
    agreementId = res.data.agreement_id;
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
    if (e.response?.data?.error) console.error(`   Detail: ${e.response.data.error}`);
    process.exit(1);
  }

  // 4. TEST: Fetch buyer agreements
  console.log('\n--- Test 2: Fetch Buyer Agreements ---');
  try {
    const res = await axios.get(`${API}/agreement-workflow/buyer/${customerId}`);
    console.log(`✅ SUCCESS: Found ${res.data.agreements?.length || 0} agreements`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 5. TEST: Fetch admin pending
  console.log('\n--- Test 3: Fetch Admin Pending ---');
  try {
    const res = await axios.get(`${API}/agreement-workflow/admin/pending`);
    console.log(`✅ SUCCESS: Found ${res.data.agreements?.length || 0} pending`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 6. TEST: Fetch admin all
  console.log('\n--- Test 4: Fetch Admin All ---');
  try {
    const res = await axios.get(`${API}/agreement-workflow/admin/all`);
    console.log(`✅ SUCCESS: Found ${res.data.agreements?.length || 0} total`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 7. TEST: Get single agreement
  console.log('\n--- Test 5: Get Agreement Details ---');
  try {
    const res = await axios.get(`${API}/agreement-workflow/${agreementId}`);
    console.log(`✅ SUCCESS: Agreement #${res.data.agreement?.id}, Status: ${res.data.agreement?.status}`);
    console.log(`   Property: ${res.data.agreement?.property_title}`);
    console.log(`   Customer: ${res.data.agreement?.customer_name}`);
    console.log(`   Owner: ${res.data.agreement?.owner_name}`);
    console.log(`   Agreement Type: ${res.data.agreement?.agreement_type}`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 8. TEST: Forward to owner
  console.log('\n--- Test 6: Forward to Owner ---');
  try {
    const usersRes = await axios.get(`${API}/users`);
    const admin = usersRes.data.find(u => u.role === 'property_admin');
    if (admin) {
      const res = await axios.put(`${API}/agreement-workflow/${agreementId}/forward-to-owner`, {
        admin_id: admin.id,
        admin_notes: 'Please review this agreement request'
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    } else {
      console.log('⏭️  SKIP: No property_admin found');
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 9. TEST: Owner decision (accept)
  console.log('\n--- Test 7: Owner Accept ---');
  try {
    const db = require('../server/config/db');
    const [agr] = await db.query('SELECT owner_id FROM agreement_requests WHERE id = ?', [agreementId]);
    if (agr.length > 0) {
      const res = await axios.put(`${API}/agreement-workflow/${agreementId}/owner-decision`, {
        owner_id: agr[0].owner_id,
        decision: 'accepted',
        owner_notes: 'Accepted - looks good'
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 10. TEST: Generate agreement document
  console.log('\n--- Test 8: Generate Agreement Document ---');
  try {
    const usersRes = await axios.get(`${API}/users`);
    const admin = usersRes.data.find(u => u.role === 'property_admin');
    if (admin) {
      const res = await axios.post(`${API}/agreement-workflow/${agreementId}/generate-agreement`, {
        admin_id: admin.id,
        template_id: 1
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 11. TEST: View agreement document
  console.log('\n--- Test 9: View Agreement Document ---');
  try {
    const res = await axios.get(`${API}/agreement-workflow/${agreementId}/view-agreement`);
    const hasHTML = res.data.document?.document_content?.length > 100;
    console.log(`✅ SUCCESS: Agreement document loaded (${res.data.document?.document_content?.length} chars)`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 12. TEST: Buyer sign
  console.log('\n--- Test 10: Buyer Sign ---');
  try {
    const res = await axios.put(`${API}/agreement-workflow/${agreementId}/buyer-sign`, {
      buyer_id: customerId,
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJREFork=='
    });
    console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 13. TEST: Owner sign  
  console.log('\n--- Test 11: Owner Sign ---');
  try {
    const db = require('../server/config/db');
    const [agr] = await db.query('SELECT owner_id FROM agreement_requests WHERE id = ?', [agreementId]);
    if (agr.length > 0) {
      const res = await axios.put(`${API}/agreement-workflow/${agreementId}/owner-sign`, {
        owner_id: agr[0].owner_id,
        signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAABJREFork=='
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }
  // 14. TEST: Submit Payment
  console.log('\n--- Test 12: Buyer Submit Payment ---');
  try {
    const res = await axios.post(`${API}/agreement-workflow/${agreementId}/submit-payment`, {
      buyer_id: customerId,
      payment_method: 'bank_transfer',
      payment_amount: 75000000,
      payment_reference: 'TXN-TEST-123',
      receipt_document: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    });
    console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 15. TEST: Admin Verify Payment
  console.log('\n--- Test 13: Admin Verify Payment ---');
  try {
    const usersRes = await axios.get(`${API}/users`);
    const admin = usersRes.data.find(u => u.role === 'property_admin');
    if (admin) {
      const res = await axios.put(`${API}/agreement-workflow/${agreementId}/verify-payment`, {
        admin_id: admin.id,
        admin_notes: 'Payment received via test bank flow'
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 16. TEST: Handover Confirmation
  console.log('\n--- Test 14: Handover Confirmation ---');
  try {
    const res = await axios.put(`${API}/agreement-workflow/${agreementId}/confirm-handover`, {
      buyer_id: customerId
    });
    console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 17. TEST: Release Funds
  console.log('\n--- Test 15: Release Funds ---');
  try {
    const usersRes = await axios.get(`${API}/users`);
    const admin = usersRes.data.find(u => u.role === 'property_admin');
    if (admin) {
      const res = await axios.put(`${API}/agreement-workflow/${agreementId}/release-funds`, {
        admin_id: admin.id,
        commission_percentage: 5,
        admin_notes: 'Funds released to owner'
      });
      console.log(`✅ SUCCESS: ${res.data.message}, Status: ${res.data.status}`);
    }
  } catch (e) {
    console.error(`❌ FAIL: ${e.response?.data?.message || e.message}`);
  }

  // 14. TEST: Other route files
  console.log('\n--- Test 12: agreement-requests endpoints ---');
  try {
    const res = await axios.get(`${API}/agreement-requests/customer/${customerId}`);
    console.log(`✅ agreement-requests/customer: Found ${res.data?.length || 0} requests`);
  } catch (e) {
    console.error(`❌ agreement-requests/customer: ${e.response?.data?.message || e.message}`);
  }

  try {
    const res = await axios.get(`${API}/agreement-requests/admin/pending`);
    console.log(`✅ agreement-requests/admin/pending: Found ${res.data?.length || 0} requests`);
  } catch (e) {
    console.error(`❌ agreement-requests/admin/pending: ${e.response?.data?.message || e.message}`);
  }

  try {
    const res = await axios.get(`${API}/agreement-requests/admin/history`);
    console.log(`✅ agreement-requests/admin/history: Found ${res.data?.length || 0} history entries`);
  } catch (e) {
    console.error(`❌ agreement-requests/admin/history: ${e.response?.data?.message || e.message}`);
  }

  console.log('\n--- Test 13: agreements endpoints ---');
  try {
    const res = await axios.get(`${API}/agreements/customer/${customerId}`);
    console.log(`✅ agreements/customer: Found ${res.data?.length || 0} agreements`);
  } catch (e) {
    console.error(`❌ agreements/customer: ${e.response?.data?.message || e.message}`);
  }

  console.log('\n--- Test 14: real-estate-agreement endpoints ---');
  try {
    const res = await axios.get(`${API}/real-estate-agreement/customer/${customerId}`);
    console.log(`✅ real-estate-agreement/customer: Found ${res.data?.length || 0} agreements`);
  } catch (e) {
    console.error(`❌ real-estate-agreement/customer: ${e.response?.data?.message || e.message}`);
  }

  console.log('\n--- Test 15: notifications check ---');
  try {
    const res = await axios.get(`${API}/agreement-management/${agreementId}/notifications`);
    console.log(`✅ agreement-management notifications: Found ${res.data?.notifications?.length || 0} notifications`);
  } catch (e) {
    console.error(`❌ agreement-management notifications: ${e.response?.data?.message || e.message}`);
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  try {
    const db = require('../server/config/db');
    await db.query('DELETE FROM agreement_signatures WHERE agreement_request_id = ?', [agreementId]);
    await db.query('DELETE FROM agreement_documents WHERE agreement_request_id = ?', [agreementId]);
    await db.query('DELETE FROM agreement_workflow_history WHERE agreement_request_id = ?', [agreementId]);
    await db.query('DELETE FROM agreement_notifications WHERE agreement_request_id = ?', [agreementId]);
    await db.query('DELETE FROM agreement_requests WHERE id = ?', [agreementId]);
    console.log(`✅ Cleaned up test data for agreement #${agreementId}`);
  } catch (e) {
    console.log('⚠️  Cleanup error:', e.message);
  }

  console.log('\n=== ALL TESTS COMPLETE ===');
  process.exit(0);
}

test();
