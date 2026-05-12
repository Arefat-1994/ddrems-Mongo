const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testConnections() {
  console.log('--- Testing Connections ---');

  // Test Cloudinary
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || cloudName === 'your_cloud_name') {
      console.log('⚠️ Cloudinary Connection: SKIPPED (Credentials not set up)');
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      
      const result = await cloudinary.api.ping();
      if (result.status === 'ok') {
        console.log('✅ Cloudinary Connection: SUCCESS!');
      } else {
        console.error('❌ Cloudinary Connection: FAILED (Unexpected response)');
      }
    }
  } catch (error) {
    console.error('❌ Cloudinary Connection: FAILED!');
    console.error(`   Error: ${error.message}`);
  }

  console.log('\n---------------------------\n');

  // Test MongoDB
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ddre';
    console.log(`Attempting to connect to MongoDB at: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connection: SUCCESS!');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`   Found ${collections.length} collections in the database.`);
    
  } catch (error) {
    console.error('❌ MongoDB Connection: FAILED!');
    console.error(`   Error: ${error.message}`);
  } finally {
    mongoose.connection.close();
  }
}

testConnections();
