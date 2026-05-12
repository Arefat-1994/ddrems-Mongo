const mongoose = require('mongoose');

const OtpVerificationLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  otp_code: { type: String },
  is_valid: { type: Boolean },
  ip_address: { type: String },
  user_agent: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('OtpVerificationLog', OtpVerificationLogSchema);
