const mongoose = require('mongoose');

const ProfileEditRequestsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  profile_id: { type: mongoose.Schema.Types.ObjectId },
  request_type: { type: String },
  status: { type: String },
  reason: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
  profile_type: { type: String },
  requested_changes: { type: Object },
  admin_notes: { type: String },
  requested_at: { type: Date },
  reviewed_at: { type: Date },
  approved_at: { type: Date },
  rejected_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ProfileEditRequests', ProfileEditRequestsSchema);
