const mongoose = require('mongoose');

const MpesaTransactionsSchema = new mongoose.Schema({
  agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreements' },
  buyer_id: { type: mongoose.Schema.Types.ObjectId },
  phone: { type: String },
  amount: { type: Number },
  merchant_request_id: { type: mongoose.Schema.Types.ObjectId },
  checkout_request_id: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String },
  result_code: { type: String },
  result_desc: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MpesaTransactions', MpesaTransactionsSchema);
