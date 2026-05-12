const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bank_name: { type: String, required: true },
  account_number: { type: String, required: true },
  account_name: { type: String, required: true, default: 'DDREMS' },
  type: { type: String, enum: ['bank', 'mobile', 'chapa_manual'], default: 'bank' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BankAccounts', bankAccountSchema);
