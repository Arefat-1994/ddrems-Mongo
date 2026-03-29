const axios = require('axios');

(async () => {
  try {
    console.log('🧪 Testing Agreement Request API\n');

    // Test data
    const testData = {
      property_id: 10,  // Use an existing property
      customer_id: 5,   // Use an existing customer
      customer_notes: 'I am interested in this property'
    };

    console.log('📤 Sending request to: POST /api/real-estate-agreement/request');
    console.log('📋 Data:', testData);
    console.log('');

    const response = await axios.post(
      'http://localhost:5000/api/real-estate-agreement/request',
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ SUCCESS!');
    console.log('📨 Response:', response.data);
    console.log('');
    console.log('✅ Agreement request created successfully!');
    console.log(`   Agreement ID: ${response.data.agreement_id}`);

  } catch (error) {
    console.error('❌ ERROR!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
})();
