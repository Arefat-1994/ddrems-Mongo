const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const https = require('https');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function testKenya() {
  console.log('--- Testing KENYA Shortcode with ETHIOPIA BASE_URL ---');
  
  const BASE_URL = process.env.MPESA_BASE_URL.trim();
  const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY.trim();
  const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET.trim();
  
  // Default Safaricom Kenya Sandbox credentials
  const KENYA_SHORTCODE = '174379';
  const KENYA_PASSKEY = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
  
  try {
    // 1. Get Token
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get(
      `${BASE_URL}/v1/token/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` }, httpsAgent }
    );
    const token = tokenRes.data.access_token;
    console.log('✅ Token obtained');
    
    // 2. STK Push with Kenya credentials
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(`${KENYA_SHORTCODE}${KENYA_PASSKEY}${timestamp}`).toString('base64');
    
    const payload = {
      MerchantRequestID: `TEST-KENYA-${Date.now()}`,
      BusinessShortCode: KENYA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: '254700000000', // Kenya number
      PartyB: KENYA_SHORTCODE,
      PhoneNumber: '254700000000',
      CallBackURL: 'https://webhook.site/852f46fe-65c6-406a-9466-06fce89d67a2',
      AccountReference: 'TEST-KENYA',
      TransactionDesc: 'Kenya Test'
    };
    
    const res = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v3/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` }, httpsAgent }
    );
    
    console.log('✅ Result:', JSON.stringify(res.data, null, 2));
    
  } catch (err) {
    console.error('\n❌ Failed:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('   Message:', err.message);
    }
  }
}

testKenya();
