const mongoose = require('mongoose');

const SiteChecksSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  inspector_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  inspector_gps_lat: { type: Number },
  inspector_gps_lng: { type: Number },
  property_lat: { type: Number },
  property_lng: { type: Number },
  distance_meters: { type: Number },
  within_radius: { type: Boolean },
  photo_url: { type: String },
  photo_timestamp: { type: Date },
  status: { type: String },
  admin_comment: { type: String },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  reviewed_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SiteChecks', SiteChecksSchema);
