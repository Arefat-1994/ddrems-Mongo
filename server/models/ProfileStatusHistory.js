const mongoose = require('mongoose');

const ProfileStatusHistorySchema = new mongoose.Schema({
  profile_id: { type: mongoose.Schema.Types.ObjectId },
  profile_type: { type: String },
  old_status: { type: String },
  new_status: { type: String },
  changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  reason: { type: String },
  changed_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ProfileStatusHistory', ProfileStatusHistorySchema);
