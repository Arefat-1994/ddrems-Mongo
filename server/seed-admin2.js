const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const { Users } = require('./models');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedSystemAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = 'admin123@gmail.com';
    const password = 'admin123';
    
    let admin = await Users.findOne({ email });
    
    if (admin) {
      console.log('User exists! Updating to system_admin role...');
      admin.password = await bcrypt.hash(password, 10);
      admin.role = 'system_admin';
      admin.status = 'active';
      admin.profile_approved = true;
      admin.profile_completed = true;
      await admin.save();
    } else {
      console.log('Creating new system admin...');
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = await Users.create({
        name: 'System Admin',
        email: email,
        password: hashedPassword,
        role: 'system_admin',
        status: 'active',
        profile_approved: true,
        profile_completed: true
      });
    }

    console.log(`✅ System Admin Account Ready!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: system_admin`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding system admin:', error);
    process.exit(1);
  }
}

seedSystemAdmin();
