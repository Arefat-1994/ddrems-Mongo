const mongoose = require('mongoose');

const KeyRequestsSchema = new mongoose.Schema({
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  document_id: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String },
  access_key: { type: String },
  request_message: { type: String },
  response_message: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  resolved_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('KeyRequests', KeyRequestsSchema);
