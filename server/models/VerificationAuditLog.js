const mongoose = require('mongoose');

const VerificationAuditLogSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  action: { type: String },
  performed_by: { type: Number },
  performer_role: { type: String },
  details: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('VerificationAuditLog', VerificationAuditLogSchema);
