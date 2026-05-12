const mongoose = require('mongoose');

const CaptchaChallengesSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  challenge_type: { type: String },
  challenge_data: { type: Object },
  solution_hash: { type: String },
  attempts: { type: Number },
  max_attempts: { type: Number },
  is_solved: { type: Boolean },
  expires_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CaptchaChallenges', CaptchaChallengesSchema);
