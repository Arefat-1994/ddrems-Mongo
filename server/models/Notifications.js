const mongoose = require('mongoose');

const NotificationsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  title: { type: String },
  message: { type: String },
  type: { type: String },
  notification_type: { type: String },
  is_read: { type: Boolean },
  link: { type: String },
  action_url: { type: String },
  related_id: { type: mongoose.Schema.Types.ObjectId },
  created_at: { type: Date },
  icon: { type: String },
  metadata: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Notifications', NotificationsSchema);
