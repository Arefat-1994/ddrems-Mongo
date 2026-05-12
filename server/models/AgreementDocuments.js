const mongoose = require('mongoose');

const AgreementDocumentsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  version: { type: Number },
  document_type: { type: String },
  document_content: { type: String },
  document_html: { type: String },
  generated_by_id: { type: mongoose.Schema.Types.ObjectId },
  generated_date: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementDocuments', AgreementDocumentsSchema);
