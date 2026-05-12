const mongoose = require('mongoose');

const CommissionTrackingSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  agreement_amount: { type: Number },
  customer_commission_percentage: { type: Number },
  owner_commission_percentage: { type: Number },
  customer_commission: { type: Number },
  owner_commission: { type: Number },
  total_commission: { type: Number },
  calculated_at: { type: Date },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  broker_engagement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'BrokerEngagements' },
  status: { type: String },
  commission_type: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('CommissionTracking', CommissionTrackingSchema);
