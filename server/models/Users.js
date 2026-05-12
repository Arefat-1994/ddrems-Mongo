const mongoose = require('mongoose');

const UsersSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  password: { type: String },
  phone: { type: String },
  profile_image: { type: String },
  role: { type: String },
  status: { type: String },
  profile_approved: { type: Boolean },
  profile_completed: { type: Boolean },
  profile_submitted_at: { type: Date },
  profile_approved_at: { type: Date },
  profile_approval_notes: { type: String },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Users', UsersSchema);
