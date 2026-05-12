const mongoose = require('mongoose');

const BrokerProfilesSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  full_name: { type: String },
  phone_number: { type: String },
  address: { type: String },
  profile_photo: { type: String },
  id_document: { type: String },
  broker_license: { type: String },
  license_number: { type: String },
  profile_status: { type: String },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  approved_at: { type: Date },
  rejection_reason: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  completed_properties_count: { type: Number },
  bonus_eligible_value: { type: Number },
  total_bonus_earned: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('BrokerProfiles', BrokerProfilesSchema);
