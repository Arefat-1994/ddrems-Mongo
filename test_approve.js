const axios = require('axios');
const db = require('./server/config/db');

async function test() {
  try {
    const [apps] = await db.query("SELECT id FROM broker_applications WHERE email = 'testbroker3@example.com'");
    if (apps.length > 0) {
      const id = apps[0].id;
      const res = await axios.post(`http://localhost:5000/api/broker-applications/${id}/approve`);
      console.log('Approve success:', res.data);
    } else {
      console.log('App not found');
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
    process.exit();
  }
}
test();
