const mongoose = require('mongoose');

const PaymentsSchema = new mongoose.Schema({
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Transactions' },
  amount: { type: Number },
  payment_date: { type: Date },
  status: { type: String },
  payment_method: { type: String },
  reference_number: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Payments', PaymentsSchema);
