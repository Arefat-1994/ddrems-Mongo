const mongoose = require('mongoose');

const FraudAlertsSchema = new mongoose.Schema({
  alert_type: { type: String },
  severity: { type: String },
  description: { type: String },
  related_entity_type: { type: String },
  related_entity_id: { type: mongoose.Schema.Types.ObjectId },
  status: { type: String },
  created_at: { type: Date },
  resolved_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('FraudAlerts', FraudAlertsSchema);
