const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const { BrokerApplications } = require('./server/models');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    let app = await BrokerApplications.findOne({ email: 'testbroker3@example.com' });
    if (!app) {
      console.log('Creating dummy app...');
      app = await BrokerApplications.create({
        full_name: 'Test Broker 3',
        email: 'testbroker3@example.com',
        phone_number: '1234567890',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    if (app) {
      const id = app._id;
      const res = await axios.post(`http://localhost:5000/api/broker-applications/${id}/approve`);
      console.log('Approve success:', res.data);
    } else {
      console.log('App not found');
    }
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
test();
