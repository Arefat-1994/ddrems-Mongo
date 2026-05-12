const mongoose = require('mongoose');

const AgreementWorkflowHistorySchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  step_number: { type: Number },
  step_name: { type: String },
  action: { type: String },
  action_by_id: { type: mongoose.Schema.Types.ObjectId },
  previous_status: { type: String },
  new_status: { type: String },
  notes: { type: String },
  created_at: { type: Date },
  action_date: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementWorkflowHistory', AgreementWorkflowHistorySchema);
