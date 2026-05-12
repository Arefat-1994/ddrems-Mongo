const mongoose = require('mongoose');

const AgreementTemplatesSchema = new mongoose.Schema({
  template_name: { type: String },
  template_content: { type: String },
  created_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('AgreementTemplates', AgreementTemplatesSchema);
