const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  rating: { type: Number },
  comment: { type: String },
  feedback_type: { type: String },
  status: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);
