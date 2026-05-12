const mongoose = require('mongoose');

const ComplaintsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  subject: { type: String },
  description: { type: String },
  category: { type: String },
  priority: { type: String },
  status: { type: String },
  admin_response: { type: String },
  resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  resolved_at: { type: Date },
  created_at: { type: Date },
  updated_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Complaints', ComplaintsSchema);
