const mongoose = require('mongoose');

const BrokerApplicationsSchema = new mongoose.Schema({
  full_name: { type: String },
  email: { type: String },
  phone_number: { type: String },
  id_document: { type: String },
  license_document: { type: String },
  status: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  profile_photo: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('BrokerApplications', BrokerApplicationsSchema);
