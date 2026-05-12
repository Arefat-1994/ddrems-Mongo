const mongoose = require('mongoose');

const PropertyRequestsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  request_type: { type: String },
  request_message: { type: String },
  status: { type: String },
  response_message: { type: String },
  responded_at: { type: Date },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('PropertyRequests', PropertyRequestsSchema);
