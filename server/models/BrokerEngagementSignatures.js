const mongoose = require('mongoose');

const BrokerEngagementSignaturesSchema = new mongoose.Schema({
  engagement_id: { type: mongoose.Schema.Types.ObjectId },
  signer_id: { type: mongoose.Schema.Types.ObjectId },
  signer_role: { type: String },
  signature_data: { type: String },
  signed_at: { type: Date },
  ip_address: { type: String },
  user_agent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('BrokerEngagementSignatures', BrokerEngagementSignaturesSchema);
