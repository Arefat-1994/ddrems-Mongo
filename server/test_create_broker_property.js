const axios = require('axios');

async function testBrokerCreate() {
  try {
    const propertyForm = {
      title: 'Real Broker Test', 
      type: 'apartment', 
      listing_type: 'sale', 
      price: '50000', 
      location: 'Addis Ababa',
      bedrooms: '', 
      bathrooms: '', 
      area: '', 
      description: 'good',
      distance_to_center_km: '3', 
      near_school: false, 
      near_hospital: false,
      near_market: false, 
      parking: false, 
      security_rating: '3', 
      condition: 'Good',
      address: '', 
      city: '', 
      state: '', 
      zip_code: '', 
      features: [],
      latitude: '', 
      longitude: '', 
      model_3d_path: '', 
      owner_id: ''
    };

    const payload = {
      ...propertyForm,
      broker_id: 2, // Assume some broker id
      status: 'pending'
    };

    console.log('Sending exact UI payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post('http://localhost:5000/api/properties', payload);
    console.log('Success:', response.data);
  } catch (error) {
    console.log('--- ERROR OBJECT ---');
    console.error(error.response ? error.response.data : error.message);
  }
  process.exit(0);
}

testBrokerCreate();
