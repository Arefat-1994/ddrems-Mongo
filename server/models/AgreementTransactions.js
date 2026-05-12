const mongoose = require('mongoose');

const AgreementTransactionsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  broker_engagement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrokerEngagements' },
  transaction_type: { type: String },
  transaction_status: { type: String },
  buyer_id: { type: mongoose.Schema.Types.ObjectId },
  seller_id: { type: mongoose.Schema.Types.ObjectId },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  transaction_amount: { type: Number },
  commission_amount: { type: Number },
  net_amount: { type: Number },
  completion_date: { type: Date },
  created_at: { type: Date },
  payout_payment_method: { type: String },
  payout_receipt_path: { type: String },
  owner_verified_payout: { type: Boolean },
  broker_verified_payout: { type: Boolean },
  owner_verified_at: { type: Date },
  broker_verified_at: { type: Date },
  transaction_reference: { type: String },
  receipt_number: { type: String },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementTransactions', AgreementTransactionsSchema);
