const mongoose = require('mongoose');

const LoginAttemptsSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  // Total consecutive failed attempts (resets on successful login)
  failed_count: { type: Number, default: 0 },
  // Phase: 'normal' -> 'locked' -> 'suspicious' -> 'banned'
  phase: { type: String, default: 'normal', enum: ['normal', 'locked', 'suspicious', 'banned'] },
  // When the first-phase lockout expires (1 minute)
  lockout_until: { type: Date, default: null },
  // IP address of last attempt
  last_ip: { type: String },
  // Timestamp of last failed attempt
  last_failed_at: { type: Date },
  // When the account was flagged suspicious
  flagged_suspicious_at: { type: Date },
  // When the account was banned
  banned_at: { type: Date },
  // Admin who unbanned (if applicable)
  unbanned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  unbanned_at: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('LoginAttempts', LoginAttemptsSchema);
