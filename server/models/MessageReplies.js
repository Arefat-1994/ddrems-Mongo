const mongoose = require('mongoose');

const MessageRepliesSchema = new mongoose.Schema({
  message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Messages' },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  message: { type: String },
  is_read: { type: Boolean },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MessageReplies', MessageRepliesSchema);
