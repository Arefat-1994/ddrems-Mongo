const axios = require('axios');

async function testBrokerEndpoint() {
  console.log('🧪 Testing Broker Create Account Endpoint...\n');
  
  const testData = {
    name: 'Test Broker',
    email: 'testbroker@test.com',
    phone: '+251911111111',
    password: 'admin123'
  };

  try {
    console.log('📤 Sending POST request to: http://localhost:5000/api/brokers/create-account');
    console.log('📦 Data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post('http://localhost:5000/api/brokers/create-account', testData);
    
    console.log('\n✅ SUCCESS!');
    console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    console.log('📊 Status:', response.status);
    
  } catch (error) {
    console.log('\n❌ ERROR!');
    
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📥 Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('📡 No response received from server');
      console.log('🔍 Is the server running on port 5000?');
    } else {
      console.log('⚠️ Error:', error.message);
    }
  }
}

testBrokerEndpoint();
