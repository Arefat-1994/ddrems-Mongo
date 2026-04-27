// Decode the base64 password from Postman collection to extract the passkey
const encoded = 'YmNlMDhhODI4MzJmOWQwZWZiYjgyNWM1MmNlZWJlMDI2ZjgzMjZkY2U5NTA2OTAyZmUwNDI3NjM0ODZjMTRhZg==';
const decoded = Buffer.from(encoded, 'base64').toString('utf8');
console.log('Decoded string:', decoded);
console.log('Length:', decoded.length);

// Format: Base64(Shortcode + Passkey + Timestamp)
// Shortcode = 6564 (4 chars)
// Timestamp = 14 chars (YYYYMMDDHHmmss) e.g. 20240918055823
const shortcode = '6564';
const timestamp = '20240918055823'; // from Postman

if (decoded.startsWith(shortcode)) {
  const withoutShortcode = decoded.slice(shortcode.length);
  if (withoutShortcode.endsWith(timestamp)) {
    const passkey = withoutShortcode.slice(0, withoutShortcode.length - timestamp.length);
    console.log('\n✅ Extracted Passkey:', passkey);
    console.log('Passkey length:', passkey.length);
  } else {
    console.log('After shortcode:', withoutShortcode);
    console.log('Last 14 chars (timestamp?):', withoutShortcode.slice(-14));
    console.log('Passkey (without last 14):', withoutShortcode.slice(0, -14));
  }
} else {
  console.log('Does not start with shortcode. Full decoded:', decoded);
}

// Also verify our current passkey generates the same result
const ourPasskey = 'bce08a82832f9d0efbb825c52ceebe026f8326dce9506902fe042763486c14af';
const testTimestamp = '20240918055823';
const testPassword = Buffer.from(`${shortcode}${ourPasskey}${testTimestamp}`).toString('base64');
console.log('\nOur generated password:', testPassword);
console.log('Postman password:      ', encoded);
console.log('Match:', testPassword === encoded);
