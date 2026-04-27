const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const db = require('../server/config/db');

async function testStart() {
  try {
    const [properties] = await db.query('SELECT id, latitude, longitude FROM properties WHERE latitude IS NOT NULL LIMIT 1');
    if (properties.length === 0) {
      console.log("No properties with GPS found.");
      process.exit(0);
    }
    const prop = properties[0];
    console.log("Testing with property:", prop);

    const form = new FormData();
    form.append('property_id', prop.id);
    form.append('inspector_id', 2);
    form.append('inspector_lat', prop.latitude);
    form.append('inspector_lng', prop.longitude);
    
    // Create a dummy image
    const dummyPath = path.join(__dirname, 'dummy.jpg');
    fs.writeFileSync(dummyPath, 'dummy data');
    form.append('photo', fs.createReadStream(dummyPath));

    const res = await axios.post('http://localhost:5000/api/site-check/start', form, {
      headers: form.getHeaders()
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
testStart();
