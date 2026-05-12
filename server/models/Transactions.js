const mongoose = require('mongoose');

const TransactionsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  amount: { type: Number },
  transaction_type: { type: String },
  payment_method: { type: String },
  status: { type: String },
  installment_plan: { type: Object },
  commission_amount: { type: Number },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Transactions', TransactionsSchema);
