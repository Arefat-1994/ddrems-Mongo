const mongoose = require('mongoose');

const MessageRecipientsSchema = new mongoose.Schema({
  message_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Messages' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  is_read: { type: Boolean },
  read_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('MessageRecipients', MessageRecipientsSchema);
