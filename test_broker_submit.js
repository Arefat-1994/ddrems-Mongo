const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function testSubmit() {
  try {
    const formData = new FormData();
    formData.append('full_name', 'Test Broker');
    formData.append('email', 'testbroker3@example.com');
    formData.append('phone_number', '1234567890');
    
    // Create dummy files
    fs.writeFileSync('dummy_id.txt', 'id content');
    fs.writeFileSync('dummy_license.txt', 'license content');
    
    formData.append('id_document', fs.createReadStream('dummy_id.txt'));
    formData.append('license_document', fs.createReadStream('dummy_license.txt'));

    const res = await axios.post('http://localhost:5000/api/broker-applications', formData, {
      headers: formData.getHeaders()
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  } finally {
    if (fs.existsSync('dummy_id.txt')) fs.unlinkSync('dummy_id.txt');
    if (fs.existsSync('dummy_license.txt')) fs.unlinkSync('dummy_license.txt');
  }
}

testSubmit();
