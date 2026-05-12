const mongoose = require('mongoose');

const BrokerEngagementHistorySchema = new mongoose.Schema({
  engagement_id: { type: mongoose.Schema.Types.ObjectId },
  action: { type: String },
  action_by_id: { type: mongoose.Schema.Types.ObjectId },
  action_by_role: { type: String },
  previous_status: { type: String },
  new_status: { type: String },
  notes: { type: String },
  metadata: { type: Object },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('BrokerEngagementHistory', BrokerEngagementHistorySchema);
