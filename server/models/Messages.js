const mongoose = require('mongoose');

const MessagesSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  subject: { type: String },
  message: { type: String },
  message_type: { type: String },
  status: { type: String },
  is_read: { type: Boolean },
  is_group: { type: Boolean },
  parent_id: { type: mongoose.Schema.Types.ObjectId },
  reply_count: { type: Number },
  updated_at: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Messages', MessagesSchema);
