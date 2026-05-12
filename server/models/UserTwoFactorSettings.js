const mongoose = require('mongoose');

const UserTwoFactorSettingsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  two_factor_enabled: { type: Boolean },
  two_factor_method: { type: String },
  otp_secret: { type: String },
  otp_backup_codes: { type: Object },
  otp_verified: { type: Boolean },
  security_password: { type: String },
  security_password_verified: { type: Boolean },
  captcha_enabled: { type: Boolean },
  captcha_difficulty: { type: String },
  last_2fa_verification: { type: Date },
  failed_attempts: { type: Number },
  locked_until: { type: Date },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('UserTwoFactorSettings', UserTwoFactorSettingsSchema);
