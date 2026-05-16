const mongoose = require('mongoose');
const dns = require('dns');

// Force Node.js to prefer IPv4 - fixes connectivity on many cloud providers including Render
dns.setDefaultResultOrder('ipv4first');

const MONGO_URI = 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';

const connectDB = async (retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[MongoDB] Connection attempt ${attempt}/${retries}...`);
      console.log(`[MongoDB] Connecting to: ${MONGO_URI.replace(/:[^:@]+@/, ':****@')}`);
      
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 30000,  // Wait 30s for server selection (Render cold starts are slow)
        connectTimeoutMS: 30000,          // Wait 30s for initial connection
        socketTimeoutMS: 45000,           // Wait 45s for socket operations
        family: 4,                        // Force IPv4 - critical for Render
        retryWrites: true,
        w: 'majority',
      });
      
      console.log(`[MongoDB] Successfully connected to: ${conn.connection.host}`);
      console.log(`[MongoDB] Database name: ${conn.connection.name}`);

      // Handle connection events
      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected from database');
      });
      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err.message);
      });
      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected to database');
      });
      
      return; // Success - exit the function
    } catch (error) {
      console.error(`[MongoDB] Attempt ${attempt} failed: ${error.message}`);
      if (attempt < retries) {
        const waitTime = attempt * 3000; // 3s, 6s, 9s, 12s, 15s
        console.log(`[MongoDB] Retrying in ${waitTime / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('[MongoDB] All connection attempts failed. Exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
