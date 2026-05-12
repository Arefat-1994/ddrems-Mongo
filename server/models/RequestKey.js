const mongoose = require('mongoose');

const RequestKeySchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  status: { type: String },
  key_code: { type: String },
  request_message: { type: String },
  response_message: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  responded_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('RequestKey', RequestKeySchema);
