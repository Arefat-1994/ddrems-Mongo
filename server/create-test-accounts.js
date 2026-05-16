const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Users, CustomerProfiles, OwnerProfiles, BrokerProfiles } = require('./models');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function createTestAccounts() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    await mongoose.connect(mongoUri);

    const hashedPwd = await bcrypt.hash('password123', 10);

    // Ensure customer profile exists for antigra931@gmail.com
    let cust = await Users.findOne({ email: 'antigra931@gmail.com' });
    if (cust) {
      cust.status = 'active';
      cust.profile_approved = true;
      cust.profile_completed = true;
      cust.password = hashedPwd;
      await cust.save();
      await CustomerProfiles.updateOne({ user_id: cust._id }, { profile_status: 'approved' }, { upsert: true });
      console.log('Customer: antigra931@gmail.com / password123');
    }

    // Owner
    let owner = await Users.findOne({ email: 'owner@test.com' });
    if (!owner) {
      owner = await Users.create({
        name: 'Test Owner', email: 'owner@test.com', password: hashedPwd, role: 'owner',
        status: 'active', profile_approved: true, profile_completed: true
      });
    } else {
        owner.password = hashedPwd;
        await owner.save();
    }
    await OwnerProfiles.updateOne({ user_id: owner._id }, { profile_status: 'approved' }, { upsert: true });
    console.log('Owner: owner@test.com / password123');

    // Broker
    let broker = await Users.findOne({ email: 'broker@test.com' });
    if (!broker) {
      broker = await Users.create({
        name: 'Test Broker', email: 'broker@test.com', password: hashedPwd, role: 'broker',
        status: 'active', profile_approved: true, profile_completed: true
      });
    } else {
        broker.password = hashedPwd;
        await broker.save();
    }
    await BrokerProfiles.updateOne({ user_id: broker._id }, { profile_status: 'approved' }, { upsert: true });
    console.log('Broker: broker@test.com / password123');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createTestAccounts();
