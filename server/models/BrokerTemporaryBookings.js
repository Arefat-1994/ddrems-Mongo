const mongoose = require('mongoose');

const BrokerTemporaryBookingsSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Properties' },
  broker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  property_admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  buyer_name: { type: String },
  phone: { type: String },
  id_type: { type: String },
  id_number: { type: String },
  document_status: { type: String },
  preferred_visit_time: { type: String },
  notes: { type: String },
  status: { type: String },
  booking_time: { type: Date },
  hold_expiry_time: { type: Date },
  customer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
}, { timestamps: true });

module.exports = mongoose.model('BrokerTemporaryBookings', BrokerTemporaryBookingsSchema);
