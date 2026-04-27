const axios = require('axios');
const db = require('./server/config/db');

async function testFlow() {
  try {
    // 1. Submit a new broker application
    console.log('=== Step 1: Submit broker application ===');
    const FormData = require('form-data');
    const fs = require('fs');
    
    const formData = new FormData();
    formData.append('full_name', 'Flow Test Broker');
    formData.append('email', 'flowtest@example.com');
    formData.append('phone_number', '+251911223344');
    
    fs.writeFileSync('dummy_id.txt', 'id content');
    fs.writeFileSync('dummy_license.txt', 'license content');
    formData.append('id_document', fs.createReadStream('dummy_id.txt'));
    formData.append('license_document', fs.createReadStream('dummy_license.txt'));

    const submitRes = await axios.post('http://localhost:5000/api/broker-applications', formData, {
      headers: formData.getHeaders()
    });
    console.log('Submit:', submitRes.data.message);

    // 2. Admin approves application
    console.log('\n=== Step 2: Admin approves application ===');
    const [apps] = await db.query("SELECT id FROM broker_applications WHERE email = 'flowtest@example.com'");
    const approveRes = await axios.post(`http://localhost:5000/api/broker-applications/${apps[0].id}/approve`);
    console.log('Approve:', approveRes.data.message);

    // 3. Check user was created correctly
    console.log('\n=== Step 3: Verify user flags ===');
    const [users] = await db.query("SELECT id, name, email, role, status, profile_completed, profile_approved FROM users WHERE email = 'flowtest@example.com'");
    const user = users[0];
    console.log('User created:', {
      id: user.id, 
      role: user.role,
      status: user.status,
      profile_completed: user.profile_completed,
      profile_approved: user.profile_approved
    });

    // 4. Verify NO broker_profiles row exists
    console.log('\n=== Step 4: Verify no broker_profiles row ===');
    const [profiles] = await db.query("SELECT * FROM broker_profiles WHERE user_id = ?", [user.id]);
    console.log('Broker profile rows:', profiles.length, '(should be 0)');

    // 5. Verify login works
    console.log('\n=== Step 5: Verify login ===');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'flowtest@example.com',
      password: '' // We don't know the password, just checking the structure
    }).catch(err => ({ data: err.response?.data }));
    console.log('Login response:', loginRes.data);

    // Cleanup
    fs.unlinkSync('dummy_id.txt');
    fs.unlinkSync('dummy_license.txt');

    console.log('\n✅ Flow test complete!');
    console.log('Expected behavior:');
    console.log('  - Broker logs in → sees only Dashboard + Profile in sidebar');
    console.log('  - Broker completes profile form → profile_completed becomes true');
    console.log('  - Broker sees "pending approval" message');
    console.log('  - Admin approves profile → profile_approved becomes true');
    console.log('  - Broker now has full access');

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  } finally {
    process.exit();
  }
}
testFlow();
