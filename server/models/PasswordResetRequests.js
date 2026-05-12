const mongoose = require('mongoose');

const PasswordResetRequestsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  email: { type: String },
  otp_code: { type: String },
  status: { type: String },
  requested_at: { type: Date },
  reset_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetRequests', PasswordResetRequestsSchema);
