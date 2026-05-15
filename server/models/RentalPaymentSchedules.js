const mongoose = require('mongoose');

const RentalPaymentSchedulesSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  broker_engagement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrokerEngagements' },
  tenant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  installment_number: { type: Number },
  amount: { type: Number },
  due_date: { type: Date },
  status: { type: String },
  payment_method: { type: String },
  receipt_url: { type: String },
  transaction_reference: { type: String },
  paid_at: { type: Date },
  verified_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  verified_at: { type: Date },
  verification_notes: { type: String },
  commission_deducted: { type: Boolean },
  broker_commission_amount: { type: Number },
  system_fee_amount: { type: Number },
  owner_net_amount: { type: Number },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

// Optimize queries with indexes
RentalPaymentSchedulesSchema.index({ tenant_id: 1 });
RentalPaymentSchedulesSchema.index({ owner_id: 1 });
RentalPaymentSchedulesSchema.index({ property_id: 1 });
RentalPaymentSchedulesSchema.index({ due_date: 1 });
RentalPaymentSchedulesSchema.index({ status: 1 });

module.exports = mongoose.model('RentalPaymentSchedules', RentalPaymentSchedulesSchema);
