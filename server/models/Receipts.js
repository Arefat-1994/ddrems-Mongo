const mongoose = require('mongoose');

const ReceiptsSchema = new mongoose.Schema({
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transactions' },
  receipt_number: { type: String },
  receipt_document: { type: String },
  issued_date: { type: Date },
  issued_by: { type: Number },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Receipts', ReceiptsSchema);
