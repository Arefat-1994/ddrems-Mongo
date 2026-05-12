const mongoose = require('mongoose');

const AgreementSignaturesSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  signer_id: { type: mongoose.Schema.Types.ObjectId },
  signer_role: { type: String },
  signature_data: { type: String },
  signed_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementSignatures', AgreementSignaturesSchema);
