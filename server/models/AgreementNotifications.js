const mongoose = require('mongoose');

const AgreementNotificationsSchema = new mongoose.Schema({
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  agreement_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreements' },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  notification_type: { type: String },
  notification_title: { type: String },
  notification_message: { type: String },
  is_read: { type: Boolean },
  sent_date: { type: Date },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementNotifications', AgreementNotificationsSchema);
