const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  action: { type: String },
  table_name: { type: String },
  record_id: { type: mongoose.Schema.Types.ObjectId },
  old_value: { type: String },
  new_value: { type: String },
  ip_address: { type: String },
  created_at: { type: Date },
  user_agent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
