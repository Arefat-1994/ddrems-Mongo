const axios = require('axios');

const testRegistration = async () => {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'Test Owner',
      email: `testowner_${Date.now()}@example.com`,
      phone: '0912345678',
      password: 'password123',
      role: 'owner'
    });
    console.log('Registration Success:', response.data);
  } catch (error) {
    console.error('Registration Failed:', error.response ? error.response.data : error.message);
  }
};

testRegistration();
