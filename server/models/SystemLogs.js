const mongoose = require('mongoose');

const SystemLogsSchema = new mongoose.Schema({
  level: { type: String },
  message: { type: String },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  ip_address: { type: String },
  action: { type: String },
  details: { type: Object },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SystemLogs', SystemLogsSchema);
