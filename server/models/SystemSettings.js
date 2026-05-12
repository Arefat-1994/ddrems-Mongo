const mongoose = require('mongoose');

const SystemSettingsSchema = new mongoose.Schema({
  theme: { type: String },
  primaryColor: { type: String },
  accentColor: { type: String },
  soundEnabled: { type: Boolean },
  notificationsEnabled: { type: Boolean },
  systemStatus: { type: String },
  maintenanceMode: { type: Boolean },
  maintenanceMessage: { type: String },
  maxUsers: { type: Number },
  sessionTimeout: { type: Number },
  enableRegistration: { type: Boolean },
  enableBrokerRegistration: { type: Boolean },
  enableOwnerRegistration: { type: Boolean },
  twoFactorAuth: { type: Boolean },
  ipWhitelist: { type: Boolean },
  ipWhitelistAddresses: { type: String },
  apiRateLimit: { type: Number },
  apiRateLimitWindow: { type: Number },
  logLevel: { type: String },
  backupEnabled: { type: Boolean },
  backupFrequency: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', SystemSettingsSchema);
