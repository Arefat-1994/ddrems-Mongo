const mongoose = require('mongoose');

const PaymentReceiptsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  payment_method: { type: String },
  payment_amount: { type: Number },
  receipt_file_path: { type: String },
  verification_status: { type: String },
  verification_notes: { type: String },
  verified_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  verification_date: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PaymentReceipts', PaymentReceiptsSchema);
