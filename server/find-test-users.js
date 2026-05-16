const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { Users } = require('./models');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findUsers() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://arefatartzy_db_user:F5Ft3ZIctY7jtncf@real.wawowya.mongodb.net/?appName=real';
    await mongoose.connect(mongoUri);

    const customer = await Users.findOne({ role: 'user' });
    const owner = await Users.findOne({ role: 'owner' });
    const broker = await Users.findOne({ role: 'broker' });

    console.log('Customer:', customer ? customer.email : 'None found');
    console.log('Owner:', owner ? owner.email : 'None found');
    console.log('Broker:', broker ? broker.email : 'None found');

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findUsers();
