const mongoose = require('mongoose');

const EditRequestsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  request_type: { type: String },
  reason: { type: String },
  status: { type: String },
  admin_response: { type: String },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  requested_fields: [{ type: String }],
  approved_fields: [{ type: String }],
  profile_type: { type: String },
  profile_id: { type: mongoose.Schema.Types.ObjectId },
  created_at: { type: Date },
  updated_at: { type: Date },
  resolved_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('EditRequests', EditRequestsSchema);
