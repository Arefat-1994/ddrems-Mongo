const axios = require('axios');

async function testBrokerCreation() {
  try {
    console.log('Testing broker creation...');
    
    const testData = {
      name: 'Test Broker',
      email: `testbroker${Date.now()}@example.com`,
      phone: '+251912345678',
      password: 'admin123'
    };
    
    console.log('Sending request with data:', testData);
    
    const response = await axios.post('http://localhost:5000/api/brokers/create-account', testData);
    
    console.log('Success! Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBrokerCreation();
