const dotenv = require('dotenv');
const path = require('path');

// Load .env from root BEFORE requiring the service
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { getToken, stkPush } = require('../server/services/mpesa');

async function verify() {
  console.log('--- M-Pesa Integration Verification ---');
  console.log('Using Shortcode:', process.env.MPESA_SHORTCODE);
  
  try {
    console.log('\n1. Testing Token Generation...');
    const token = await getToken();
    console.log('✅ Token obtained successfully');
    
    console.log('\n2. Testing STK Push Payload (Request to Safaricom Sandbox)...');
    
    // Use a dummy phone number for testing
    const testData = {
      phone: '251911223344',
      amount: 1,
      accountRef: 'TEST-VERIFY',
      description: 'Verification Test'
    };
    
    const result = await stkPush(testData);
    console.log('✅ STK Push result:', JSON.stringify(result, null, 2));
    
  } catch (err) {
    console.error('\n❌ Verification Failed:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('   Message:', err.message);
    }
  }
}

verify();
