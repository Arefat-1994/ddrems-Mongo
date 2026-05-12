const mongoose = require('mongoose');

const ProfileCompletionStatusSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  user_role: { type: String },
  basic_info_completed: { type: Boolean },
  contact_info_completed: { type: Boolean },
  address_info_completed: { type: Boolean },
  documents_uploaded: { type: Boolean },
  verification_completed: { type: Boolean },
  completion_percentage: { type: Number },
  last_updated: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('ProfileCompletionStatus', ProfileCompletionStatusSchema);
