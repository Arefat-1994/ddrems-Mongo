const mongoose = require('mongoose');

const SystemScheduleSchema = new mongoose.Schema({
  // Schedule type: 'daily', 'weekly', 'custom'
  schedule_type: { type: String, default: 'daily', enum: ['daily', 'weekly', 'custom'] },
  // Is scheduling enabled?
  is_enabled: { type: Boolean, default: false },
  // Daily open/close times (HH:mm format)
  open_time: { type: String, default: '08:00' },
  close_time: { type: String, default: '22:00' },
  // Timezone for scheduling
  timezone: { type: String, default: 'Africa/Addis_Ababa' },
  // Days of week the system is active (0=Sun, 1=Mon, ... 6=Sat)
  active_days: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
  // Is the system currently force-closed by admin?
  force_closed: { type: Boolean, default: false },
  force_closed_message: { type: String, default: 'The system is currently closed. Please come back during operating hours.' },
  // Who last modified
  modified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('SystemSchedule', SystemScheduleSchema);
