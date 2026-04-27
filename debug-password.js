// Full analysis of the Safaricom Ethiopia STK password
const shortcode = '6564';
const timestamp = '20240918055823'; // from Postman
const postmanPassword = 'YmNlMDhhODI4MzJmOWQwZWZiYjgyNWM1MmNlZWJlMDI2ZjgzMjZkY2U5NTA2OTAyZmUwNDI3NjM0ODZjMTRhZg==';

// Decode what Postman password actually is
const decoded = Buffer.from(postmanPassword, 'base64').toString('utf8');
console.log('=== Postman Password Decoded ===');
console.log('Decoded:', decoded);
console.log('Length:', decoded.length);

// Try all combinations
console.log('\n=== Testing Password Formulas ===');

// Formula 1: Base64(passkey) - what we currently use
const passkey = 'bce08a82832f9d0efbb825c52ceebe026f8326dce9506902fe042763486c14af';
const f1 = Buffer.from(passkey).toString('base64');
console.log('F1 Base64(passkey):', f1 === postmanPassword ? '✅ MATCH' : '❌ no match');

// Formula 2: Base64(shortcode + passkey + timestamp) - Kenya style
const f2 = Buffer.from(shortcode + passkey + timestamp).toString('base64');
console.log('F2 Base64(SC+PK+TS):', f2 === postmanPassword ? '✅ MATCH' : '❌ no match');
console.log('   Generated:', f2);

// Formula 3: Base64(shortcode + timestamp + passkey)
const f3 = Buffer.from(shortcode + timestamp + passkey).toString('base64');
console.log('F3 Base64(SC+TS+PK):', f3 === postmanPassword ? '✅ MATCH' : '❌ no match');

// Formula 4: The decoded IS the passkey, use it directly as password
console.log('\n=== The decoded value IS the passkey ===');
console.log('Decoded passkey:', decoded);
// Now try: Base64(shortcode + decoded + timestamp)
const f4 = Buffer.from(shortcode + decoded + timestamp).toString('base64');
console.log('F4 Base64(SC+decoded+TS):', f4 === postmanPassword ? '✅ MATCH' : '❌ no match');
console.log('   Generated:', f4);

// Formula 5: Base64(decoded + timestamp)
const f5 = Buffer.from(decoded + timestamp).toString('base64');
console.log('F5 Base64(decoded+TS):', f5 === postmanPassword ? '✅ MATCH' : '❌ no match');

// The real answer: the Postman password IS already the base64 of the passkey
// So the passkey = decoded = bce08a82832f9d0efbb825c52ceebe026f8326dce9506902fe042763486c14af
// And the password to send = postmanPassword (static, not timestamp-based)
console.log('\n=== CONCLUSION ===');
console.log('The Postman password is STATIC (not timestamp-based)');
console.log('Password to use:', postmanPassword);
console.log('This is just Base64 of the passkey string');

// Now generate what we need for a NEW timestamp
const now = new Date();
const pad = n => String(n).padStart(2, '0');
const newTimestamp = now.getFullYear() + pad(now.getMonth()+1) + pad(now.getDate()) + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
console.log('\nCurrent timestamp:', newTimestamp);
console.log('Static password (same always):', postmanPassword);
