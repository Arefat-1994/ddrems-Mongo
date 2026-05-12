const mongoose = require('mongoose');

const AgreementFieldsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  field_name: { type: String },
  field_value: { type: String },
  is_editable: { type: Boolean },
  edited_by_id: { type: mongoose.Schema.Types.ObjectId },
  edited_date: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementFields', AgreementFieldsSchema);
