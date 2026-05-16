const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Users } = require('./models');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixAdmins() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Demote propaadmin@gmail.com to property_admin
    const propAdmin = await Users.findOne({ email: 'propaadmin@gmail.com' });
    if (propAdmin) {
      propAdmin.role = 'property_admin';
      await propAdmin.save();
      console.log('✅ Successfully changed propaadmin@gmail.com back to property_admin');
    } else {
      console.log('⚠️ propaadmin@gmail.com not found. Creating it just in case...');
      const hashedPropPwd = await bcrypt.hash('admin123', 10);
      await Users.create({
        name: 'Property Admin',
        email: 'propaadmin@gmail.com',
        password: hashedPropPwd,
        role: 'property_admin',
        status: 'active',
        profile_approved: true,
        profile_completed: true
      });
      console.log('✅ Created propaadmin@gmail.com as property_admin');
    }

    // 2. Recreate admin123@gmail.com as system_admin
    const existingSysAdmin = await Users.findOne({ email: 'admin123@gmail.com' });
    const hashedSysPwd = await bcrypt.hash('admin123', 10);
    
    if (existingSysAdmin) {
      existingSysAdmin.role = 'system_admin';
      existingSysAdmin.password = hashedSysPwd;
      await existingSysAdmin.save();
      console.log('✅ Updated admin123@gmail.com to system_admin with new password');
    } else {
      await Users.create({
        name: 'System Administrator',
        email: 'admin123@gmail.com',
        password: hashedSysPwd,
        role: 'system_admin',
        status: 'active',
        profile_approved: true,
        profile_completed: true
      });
      console.log('✅ Re-created admin123@gmail.com as system_admin');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error fixing admins:', error);
    process.exit(1);
  }
}

fixAdmins();
