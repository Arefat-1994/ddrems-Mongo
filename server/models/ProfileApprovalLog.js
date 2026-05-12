const mongoose = require('mongoose');

const ProfileApprovalLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  user_role: { type: String },
  action: { type: String },
  status: { type: String },
  notes: { type: String },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ProfileApprovalLog', ProfileApprovalLogSchema);
