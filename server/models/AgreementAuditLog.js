const mongoose = require('mongoose');

const AgreementAuditLogSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  action_type: { type: String },
  action_description: { type: String },
  performed_by_id: { type: mongoose.Schema.Types.ObjectId },
  old_status: { type: String },
  new_status: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementAuditLog', AgreementAuditLogSchema);
