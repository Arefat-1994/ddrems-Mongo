const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const { Users } = require('./models');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ddre';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const email = 'propaadmin@gmail.com';
    const password = 'admin123';
    
    // Check if exists
    let admin = await Users.findOne({ email });
    
    if (admin) {
      console.log('Admin already exists! Updating password...');
      admin.password = await bcrypt.hash(password, 10);
      await admin.save();
    } else {
      console.log('Creating new property admin...');
      const hashedPassword = await bcrypt.hash(password, 10);
      admin = await Users.create({
        name: 'Property Admin',
        email: email,
        password: hashedPassword,
        role: 'property_admin',
        status: 'active',
        profile_approved: true,
        profile_completed: true
      });
    }

    console.log(`✅ Admin Account Ready!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
