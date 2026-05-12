const mongoose = require('mongoose');

const DocumentAccessSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  status: { type: String },
  requested_at: { type: Date },
  responded_at: { type: Date },
  response_message: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('DocumentAccess', DocumentAccessSchema);
