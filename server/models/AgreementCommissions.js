const mongoose = require('mongoose');

const AgreementCommissionsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  commission_type: { type: String },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_price: { type: Number },
  commission_percentage: { type: Number },
  commission_amount: { type: Number },
  payment_status: { type: String },
  calculated_by_id: { type: mongoose.Schema.Types.ObjectId },
  created_at: { type: Date },
  payment_date: { type: Date },
  payment_method: { type: String },
  payment_reference: { type: String },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementCommissions', AgreementCommissionsSchema);
