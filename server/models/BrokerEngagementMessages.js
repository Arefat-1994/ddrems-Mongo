const mongoose = require('mongoose');

const BrokerEngagementMessagesSchema = new mongoose.Schema({
  engagement_id: { type: mongoose.Schema.Types.ObjectId },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  sender_role: { type: String },
  message_type: { type: String },
  message: { type: String },
  metadata: { type: Object },
  is_read: { type: Boolean },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('BrokerEngagementMessages', BrokerEngagementMessagesSchema);
