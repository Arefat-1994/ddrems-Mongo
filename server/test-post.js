const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/users/add', {
      name: 'Test Mongoose User',
      email: 'test@ddrems.com',
      role: 'user',
      password: 'testpass123'
    });
    console.log('✅ User created:', res.data);

    const getRes = await axios.get('http://localhost:5000/api/users');
    console.log(`✅ Fetched ${getRes.data.length} users! First user:`, getRes.data[0]);
  } catch (err) {
    console.error('❌ Test failed:', err.response ? err.response.data : err.message);
  }
}
test();
