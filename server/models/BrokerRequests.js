const mongoose = require('mongoose');

const BrokerRequestsSchema = new mongoose.Schema({
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  agreement_request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AgreementRequests' },
  status: { type: String },
  created_at: { type: Date },
  viewed_at: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('BrokerRequests', BrokerRequestsSchema);
