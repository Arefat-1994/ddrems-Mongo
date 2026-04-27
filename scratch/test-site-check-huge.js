const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testHugeFile() {
  try {
    const dummyPath = path.join(__dirname, 'dummy_huge.jpg');
    // create 60MB file
    const buf = Buffer.alloc(60 * 1024 * 1024, 'a');
    fs.writeFileSync(dummyPath, buf);

    const form = new FormData();
    form.append('property_id', 20);
    form.append('inspector_id', 2);
    form.append('inspector_lat', 9.2);
    form.append('inspector_lng', 41.2);
    form.append('photo', fs.createReadStream(dummyPath));

    const res = await axios.post('http://localhost:5000/api/site-check/start', form, {
      headers: form.getHeaders()
    });
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Error Response Data:", err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
testHugeFile();
