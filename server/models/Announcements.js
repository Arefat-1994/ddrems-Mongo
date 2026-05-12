const mongoose = require('mongoose');

const AnnouncementsSchema = new mongoose.Schema({
  title: { type: String },
  content: { type: String },
  priority: { type: String },
  target_role: { type: String },
  author_id: { type: mongoose.Schema.Types.ObjectId },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Announcements', AnnouncementsSchema);
