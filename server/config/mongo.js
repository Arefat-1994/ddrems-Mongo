const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const hardcodedUri = 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    const conn = await mongoose.connect(hardcodedUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

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
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
