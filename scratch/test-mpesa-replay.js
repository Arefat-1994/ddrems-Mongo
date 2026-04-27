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
const PASSKEY = process.env.MPESA_PASSKEY.trim();

async function testPostmanReplay() {
  console.log('--- Testing Postman Replay (Static Password + Static Timestamp) ---');
  
  try {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
    const tokenRes = await axios.get(
      `${BASE_URL}/v1/token/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${credentials}` }, httpsAgent }
    );
    const token = tokenRes.data.access_token;
    console.log('✅ Token obtained');

    // The timestamp used in the Postman collection (based on debug-password.js)
    const staticTimestamp = '20240918055823';
    // The password from Postman (which is Base64(Passkey) according to debug-password.js)
    // Wait, debug-password.js says F1 matched postmanPassword.
    // F1 was Buffer.from(passkey).toString('base64')
    const staticPassword = Buffer.from(PASSKEY).toString('base64');

    console.log('Using Static Timestamp:', staticTimestamp);
    console.log('Using Static Password:', staticPassword);

    const payload = {
      MerchantRequestID: `TEST-REPLAY-${Date.now()}`,
      BusinessShortCode: SHORTCODE,
      Password: staticPassword,
      Timestamp: staticTimestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: 1,
      PartyA: '251911223344',
      PartyB: SHORTCODE,
      PhoneNumber: '251911223344',
      CallBackURL: 'https://webhook.site/852f46fe-65c6-406a-9466-06fce89d67a2',
      AccountReference: 'TEST-REPLAY',
      TransactionDesc: 'Replay Test'
    };

    const res = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v3/processrequest`,
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

testPostmanReplay();
