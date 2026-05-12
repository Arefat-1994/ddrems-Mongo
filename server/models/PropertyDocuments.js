const mongoose = require('mongoose');

const PropertyDocumentsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  document_type: { type: String },
  document_name: { type: String },
  document_path: { type: String },
  access_key: { type: String },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  uploaded_at: { type: Date },
  is_locked: { type: Boolean },
}, { timestamps: true });

module.exports = mongoose.model('PropertyDocuments', PropertyDocumentsSchema);
