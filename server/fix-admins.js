const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Users } = require('./models');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAdmins() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Delete admin123@gmail.com
    const deleteResult = await Users.deleteOne({ email: 'admin123@gmail.com' });
    if (deleteResult.deletedCount > 0) {
      console.log('✅ Successfully deleted admin123@gmail.com');
    } else {
      console.log('⚠️ admin123@gmail.com not found. Maybe already deleted.');
    }

    // 2. Promote propaadmin@gmail.com to system_admin
    const mainAdmin = await Users.findOne({ email: 'propaadmin@gmail.com' });
    if (mainAdmin) {
      mainAdmin.role = 'system_admin';
      await mainAdmin.save();
      console.log('✅ Successfully promoted propaadmin@gmail.com to system_admin');
    } else {
      console.log('❌ propaadmin@gmail.com not found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fixing admins:', error);
    process.exit(1);
  }
}

fixAdmins();
