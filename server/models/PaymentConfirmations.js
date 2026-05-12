const mongoose = require('mongoose');

const PaymentConfirmationsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  broker_engagement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrokerEngagements' },
  amount: { type: Number },
  payment_method: { type: String },
  payment_reference: { type: String },
  receipt_document: { type: String },
  chapa_response: { type: String },
  confirmed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  confirmed_at: { type: Date },
  status: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PaymentConfirmations', PaymentConfirmationsSchema);
