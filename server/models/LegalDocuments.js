const mongoose = require('mongoose');

const LegalDocumentsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  document_type: { type: String },
  document_url: { type: String },
  original_filename: { type: String },
  status: { type: String },
  admin_comment: { type: String },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  reviewed_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('LegalDocuments', LegalDocumentsSchema);
