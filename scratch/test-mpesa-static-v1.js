const axios = require('axios');
const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const BASE_URL = process.env.MPESA_BASE_URL.trim();
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY.trim();
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET.trim();
const SHORTCODE = process.env.MPESA_SHORTCODE.trim();
const STATIC_PASSWORD = process.env.MPESA_STK_PASSWORD.trim();

async function testStaticV1() {
  console.log('--- Testing STATIC Password on V1 ---');
  
  try {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get(
      `${BASE_URL}/v1/token/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` }, httpsAgent }
    );
    const token = tokenRes.data.access_token;
    console.log('✅ Token obtained');

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: STATIC_PASSWORD,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: '251911223344',
      PartyB: SHORTCODE,
      PhoneNumber: '251911223344',
      CallBackURL: 'https://webhook.site/852f46fe-65c6-406a-9466-06fce89d67a2',
      AccountReference: 'TEST-STATIC-V1',
      TransactionDesc: 'Static V1 Test'
    };

    const res = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` }, httpsAgent }
    );
    
    console.log('✅ Result:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Failed:');
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('   Message:', err.message);
    }
  }
}

testStaticV1();
