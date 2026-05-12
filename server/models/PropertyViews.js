const mongoose = require('mongoose');

const PropertyViewsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  ip_address: { type: String },
  viewed_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PropertyViews', PropertyViewsSchema);
