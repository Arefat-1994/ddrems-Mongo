const mongoose = require('mongoose');

const UserSessionsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  session_id: { type: mongoose.Schema.Types.ObjectId },
  ip_address: { type: String },
  user_agent: { type: String },
  device_type: { type: String },
  location: { type: String },
  last_active: { type: Date },
  is_active: { type: Boolean },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('UserSessions', UserSessionsSchema);
