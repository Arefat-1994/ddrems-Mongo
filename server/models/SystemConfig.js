const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  config_key: { type: String },
  config_value: { type: String },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
