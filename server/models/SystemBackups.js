const mongoose = require('mongoose');

const SystemBackupsSchema = new mongoose.Schema({
  backup_name: { type: String },
  backup_size: { type: Number },
  backup_path: { type: String },
  status: { type: String },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  created_at: { type: Date },
  restored_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SystemBackups', SystemBackupsSchema);
