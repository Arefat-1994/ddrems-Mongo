const https = require('https');
const http = require('http');

console.log('Testing connections...\n');

// Test 1: Can we reach Safaricom sandbox?
const testUrl = (url, label) => {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 8000 }, (res) => {
      console.log(`✅ ${label}: HTTP ${res.statusCode}`);
      resolve(true);
    });
    req.on('error', (e) => {
      console.log(`❌ ${label}: ${e.message}`);
      resolve(false);
    });
    req.on('timeout', () => {
      console.log(`⏰ ${label}: TIMEOUT`);
      req.destroy();
      resolve(false);
    });
  });
};

async function run() {
  await testUrl('https://apisandbox.safaricom.et', 'Safaricom Ethiopia Sandbox');
  await testUrl('https://api.safaricom.et', 'Safaricom Ethiopia Production');
  await testUrl('https://google.com', 'Internet (Google)');
  await testUrl('http://localhost:5000/api/mpesa/token', 'Local Backend /api/mpesa/token');
  
  console.log('\nDone. If Safaricom fails but Google works = Safaricom blocks your IP or requires VPN.');
  console.log('If all fail = No internet connection.');
  console.log('If local backend fails = Server not running on port 5000.');
  process.exit(0);
}
run();
