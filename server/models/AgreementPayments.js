const mongoose = require('mongoose');

const AgreementPaymentsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreements' },
  payment_method: { type: String },
  payment_amount: { type: Number },
  receipt_file_path: { type: String },
  receipt_file_name: { type: String },
  receipt_uploaded_date: { type: Date },
  payment_date: { type: Date },
  created_at: { type: Date },
  transaction_reference: { type: String },
  payment_status: { type: String },
  verified_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  verified_date: { type: Date },
  verification_notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AgreementPayments', AgreementPaymentsSchema);
