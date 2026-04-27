const axios = require('axios');

(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/broker-bookings', {
      property_id: 1, // need a valid property id
      broker_id: 1, // need a valid broker user id
      buyer_name: 'Arefat Abdi',
      phone: '0987678768',
      id_type: 'National ID',
      id_number: '98765456789',
      document_status: 'Yes',
      preferred_visit_time: '2026-04-25T17:36',
      notes: 'ok'
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
})();
