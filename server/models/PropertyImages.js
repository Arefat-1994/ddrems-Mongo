const mongoose = require('mongoose');

const PropertyImagesSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  image_url: { type: String },
  image_type: { type: String },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PropertyImages', PropertyImagesSchema);
