const mongoose = require('mongoose');

const SystemAuditLogSchema = new mongoose.Schema({
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  action: { type: String },
  entity_type: { type: String },
  entity_id: { type: mongoose.Schema.Types.ObjectId },
  old_values: { type: Object },
  new_values: { type: Object },
  ip_address: { type: String },
  user_agent: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SystemAuditLog', SystemAuditLogSchema);
