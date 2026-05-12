const mongoose = require('mongoose');

const BrokersSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  phone: { type: String },
  profile_image: { type: String },
  license_number: { type: String },
  commission_rate: { type: Number },
  total_sales: { type: Number },
  total_commission: { type: Number },
  rating: { type: Number },
  status: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Brokers', BrokersSchema);
