const axios = require('axios');
const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

// Allow self-signed certs for Safaricom Ethiopia sandbox
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const BASE_URL = (process.env.MPESA_BASE_URL || 'https://apisandbox.safaricom.et').trim();
const CONSUMER_KEY = (process.env.MPESA_CONSUMER_KEY || '').trim();
const CONSUMER_SECRET = (process.env.MPESA_CONSUMER_SECRET || '').trim();
const SHORTCODE = (process.env.MPESA_SHORTCODE || '6564').trim();
const INITIATOR_NAME = (process.env.MPESA_INITIATOR_NAME || 'Okay').trim();
const SECURITY_CREDENTIAL = (process.env.MPESA_SECURITY_CREDENTIAL || '').trim();
const CALLBACK_URL = (process.env.MPESA_CALLBACK_URL || 'https://webhook.site/852f46fe-65c6-406a-9466-06fce89d67a2').trim();
const PASSKEY = (process.env.MPESA_PASSKEY || 'bce08a82832f9d0efbb825c52ceebe026f8326dce9506902fe042763486c14af').trim();
const STK_PASSWORD = (process.env.MPESA_STK_PASSWORD || '').trim();
const STK_TIMESTAMP = (process.env.MPESA_STK_TIMESTAMP || '').trim();

// ── Generate current timestamp in YYYYMMDDHHmmss format ──────────────────────
const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};

// ── Generate STK password ─────────────────────────────────────────────────────
// Safaricom formula: Base64(ShortCode + Passkey + Timestamp)
const generateStkPassword = (timestamp) => {
  // If a static password is provided (common in some Ethiopia sandbox environments), use it
  if (STK_PASSWORD) {
    console.log('[M-Pesa] Using static password from environment');
    return STK_PASSWORD;
  }
  return Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString('base64');
};

// ── Token cache (tokens expire after ~1 hour) ─────────────────────────────────
let cachedToken = null;
let tokenExpiry = null;

// ── Generate OAuth Token ──────────────────────────────────────────────────────
const getToken = async () => {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 300000) {
    console.log('[M-Pesa] Using cached token');
    return cachedToken;
  }

  console.log('[M-Pesa] Fetching new token from:', `${BASE_URL}/v1/token/generate`);
  const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await axios.get(
    `${BASE_URL}/v1/token/generate?grant_type=client_credentials`,
    { 
      headers: { 
        Authorization: `Basic ${credentials}`,
        'Cache-Control': 'no-cache'
      }, 
      httpsAgent 
    }
  );

  cachedToken = res.data.access_token;
  // Safaricom tokens expire in 3600 seconds
  const expiresIn = (res.data.expires_in || 3600) * 1000;
  tokenExpiry = Date.now() + expiresIn;
  console.log('[M-Pesa] New token obtained, expires in', Math.round(expiresIn / 60000), 'minutes');
  return cachedToken;
};

// ── STK Push (C2B) — Buyer pays via phone prompt ──────────────────────────────
const stkPush = async ({ phone, amount, accountRef, description }) => {
  // Always get a fresh token for STK push to avoid expiry issues
  cachedToken = null;
  tokenExpiry = null;
  const token = await getToken();
  
  // Use static timestamp if provided and we have a static password
  const timestamp = STK_PASSWORD && STK_TIMESTAMP ? STK_TIMESTAMP : getTimestamp();
  const password = generateStkPassword(timestamp);

  if (STK_PASSWORD && STK_TIMESTAMP) {
    console.log('[M-Pesa STK] Using Sandbox Static Pair - Password & Timestamp');
  }

  console.log('[M-Pesa STK] Token (first 20):', token.substring(0, 20) + '...');
  console.log('[M-Pesa STK] Timestamp:', timestamp);
  console.log('[M-Pesa STK] Password:', password);
  console.log('[M-Pesa STK] Phone:', phone, '| Amount:', amount);

  const payload = {
    MerchantRequestID: `DDREMS-${accountRef}-${Date.now()}`,
    BusinessShortCode: SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(amount),
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: accountRef,
    TransactionDesc: description || 'DDREMS Property Payment'
  };

  console.log('[M-Pesa STK] Sending payload to:', `${BASE_URL}/mpesa/stkpush/v3/processrequest`);

  const res = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v3/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent }
  );
  return res.data;
};

// ── B2C — Admin pays out to owner/broker ─────────────────────────────────────
const b2cPayout = async ({ phone, amount, remarks, occasion }) => {
  const token = await getToken();
  const payload = {
    OriginatorConversationID: `DDREMS-${Date.now()}`,
    InitiatorName: INITIATOR_NAME,
    SecurityCredential: SECURITY_CREDENTIAL,
    CommandID: 'BusinessPayment',
    PartyA: SHORTCODE,
    PartyB: phone,
    Amount: Math.round(amount),
    Remarks: remarks || 'DDREMS Payout',
    Occassion: occasion || 'PropertyPayout',
    QueueTimeOutURL: CALLBACK_URL,
    ResultURL: CALLBACK_URL
  };

  const res = await axios.post(
    `${BASE_URL}/mpesa/b2c/v2/paymentrequest`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent }
  );
  return res.data;
};

// ── Reversal ──────────────────────────────────────────────────────────────────
const reverseTransaction = async ({ transactionId, amount, receiverPhone }) => {
  const token = await getToken();
  const payload = {
    OriginatorConversationID: `DDREMS-REV-${Date.now()}`,
    Initiator: INITIATOR_NAME,
    SecurityCredential: SECURITY_CREDENTIAL,
    CommandID: 'TransactionReversal',
    TransactionID: transactionId,
    Amount: Math.round(amount),
    PartyA: SHORTCODE,
    RecieverIdentifierType: '4',
    ReceiverParty: receiverPhone,
    ResultURL: CALLBACK_URL,
    QueueTimeOutURL: CALLBACK_URL,
    Remarks: 'DDREMS Reversal',
    Occasion: 'Reversal'
  };

  const res = await axios.post(
    `${BASE_URL}/mpesa/reversal/v2/request`,
    payload,
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, httpsAgent }
  );
  return res.data;
};

module.exports = { getToken, stkPush, b2cPayout, reverseTransaction };
