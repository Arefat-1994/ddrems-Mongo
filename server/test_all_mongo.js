const mongoose = require('mongoose');

async function testUri(uri) {
  try {
    console.log(`Trying ${uri}...`);
    // timeout after 2 seconds
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`✅ SUCCESS on ${uri}`);
    await mongoose.disconnect();
    return true;
  } catch (e) {
    console.log(`❌ FAILED on ${uri}: ${e.message}`);
    return false;
  }
}

async function run() {
  const uris = [
    'mongodb://localhost:27017/ddrems_db',
    'mongodb://127.0.0.1:27017/ddrems_db',
    'mongodb://0.0.0.0:27017/ddrems_db'
  ];
  for (const uri of uris) {
    const ok = await testUri(uri);
    if (ok) return;
  }
}
run();
