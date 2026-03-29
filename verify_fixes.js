const axios = require('axios');
const fs = require('fs');

const runTest = async () => {
  let log = '';
  try {
    log += 'Starting registration test...\n';
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test Owner',
      email: `testowner_${Date.now()}@example.com`,
      phone: '0912345678',
      password: 'password123',
      role: 'owner'
    });
    log += `Success: ${JSON.stringify(response.data)}\n`;
  } catch (err) {
    log += `Error: ${err.message}\n`;
    if (err.response) {
      log += `Response: ${JSON.stringify(err.response.data)}\n`;
    }
  }
  fs.writeFileSync('verification_result.txt', log);
};

runTest();
