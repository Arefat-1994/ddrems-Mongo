const mongoose = require('mongoose');

const PropertyVerificationSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  verification_status: { type: String },
  verification_notes: { type: String },
  verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  verified_at: { type: Date },
  created_at: { type: Date },
  site_checked: { type: Boolean },
  site_inspection_notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('PropertyVerification', PropertyVerificationSchema);
