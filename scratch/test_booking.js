const axios = require('axios');

async function testBooking() {
  try {
    const res = await axios.post('http://localhost:5000/api/broker-bookings', {
      property_id: 20, 
      buyer_name: 'Test Buyer',
      email: 'test' + Date.now() + '@gmail.com',
      phone: '912345678',
      profile_photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      id_type: 'National ID',
      id_number: '123456789',
      document_status: 'Yes',
      preferred_visit_time: '2026-05-01T10:00',
      notes: 'Test notes'
    });
    console.log('SUCCESS:', res.data);
  } catch (error) {
    console.error('FAILED:', error.response?.data || error.message);
  }
}

testBooking();
