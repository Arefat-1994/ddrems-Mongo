const mongoose = require('mongoose');

const CustomerProfilesSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  full_name: { type: String },
  phone_number: { type: String },
  address: { type: String },
  profile_photo: { type: String },
  id_document: { type: String },
  profile_status: { type: String },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  approved_at: { type: Date },
  rejection_reason: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CustomerProfiles', CustomerProfilesSchema);
