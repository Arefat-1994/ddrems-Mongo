const mongoose = require('mongoose');

const ServiceControlSchema = new mongoose.Schema({
  // Which role is affected
  target_role: { type: String, required: true, enum: ['user', 'owner', 'broker', 'property_admin', 'all'] },
  // Service/dashboard being controlled
  service_name: { type: String, required: true },
  // Is the service disabled?
  is_disabled: { type: Boolean, default: false },
  // Reason for disabling
  reason: { type: String, default: '' },
  // Custom message shown to affected users
  display_message: { type: String, default: 'This service is currently unavailable. Please try again later.' },
  // Status: 'repair', 'unavailable', 'maintenance', 'custom'
  status_type: { type: String, default: 'unavailable', enum: ['repair', 'unavailable', 'maintenance', 'custom'] },
  // Who disabled it
  disabled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  disabled_at: { type: Date },
  // Estimated restore time (optional)
  estimated_restore: { type: Date },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index for quick lookups
ServiceControlSchema.index({ target_role: 1, service_name: 1 });

module.exports = mongoose.model('ServiceControl', ServiceControlSchema);
