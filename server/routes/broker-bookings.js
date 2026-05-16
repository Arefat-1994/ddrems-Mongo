const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { BrokerTemporaryBookings, Properties, Users, CustomerProfiles, Notifications } = require('../models');
const bcrypt = require('bcryptjs');
const { sendEmail, templates } = require('../services/emailService');

router.post('/', async (req, res) => {
  try {
    const { property_id, broker_id, customer_id, buyer_name, phone, email, profile_photo, id_type, id_number, document_status, preferred_visit_time, notes } = req.body;
    if (!mongoose.Types.ObjectId.isValid(property_id)) return res.status(400).json({ message: 'Invalid property ID' });
    
    const property = await Properties.findById(property_id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.status === 'reserved') return res.status(400).json({ message: 'Property is already reserved' });

    let finalCustomerId = mongoose.Types.ObjectId.isValid(customer_id) ? customer_id : null;
    let tempPassword = null;

    if (!finalCustomerId && email) {
      const existing = await Users.findOne({ email });
      if (existing) { finalCustomerId = existing._id; }
      else {
        tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newUser = await Users.create({ name: buyer_name, email, phone, password: hashedPassword, role: 'user', profile_approved: false, profile_completed: false, status: 'inactive' });
        finalCustomerId = newUser._id;
        await CustomerProfiles.create({ user_id: finalCustomerId, full_name: buyer_name, phone_number: phone, profile_photo, profile_status: 'pending' });
      }
    }

    const holdExpiry = new Date(Date.now() + 30 * 60 * 1000);
    const booking = await BrokerTemporaryBookings.create({
      property_id, broker_id: mongoose.Types.ObjectId.isValid(broker_id) ? broker_id : null,
      customer_id: finalCustomerId, property_admin_id: property.property_admin_id || null,
      buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes, hold_expiry_time: holdExpiry
    });

    await Properties.findByIdAndUpdate(property_id, { status: 'reserved' });

    if (email) {
      try {
        if (tempPassword) { const e = templates.bookingInvitation(buyer_name, property.title, tempPassword, email); sendEmail(email, e.subject, e.html); }
        else { const e = templates.bookingConfirmation(buyer_name, property.title, booking._id); sendEmail(email, e.subject, e.html); }
      } catch(e) {}
    }

    if (property.property_admin_id) {
      try { await Notifications.create({ user_id: property.property_admin_id, title: 'Property Reserved', message: `Booking reserved for: ${property.title} (Buyer: ${buyer_name})`, type: 'info' }); } catch(e) {}
    }

    res.status(201).json({ message: 'Booking created successfully', booking_id: booking._id, hold_expiry_time: holdExpiry });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/', async (req, res) => {
  try {
    // ── Auto-expire: find all reserved bookings whose hold has expired ──
    const now = new Date();
    const expiredBookings = await BrokerTemporaryBookings.find({
      status: 'reserved',
      hold_expiry_time: { $lt: now }
    });
    
    for (const booking of expiredBookings) {
      booking.status = 'expired';
      await booking.save();
      // Reset property back to active so other users can access it
      await Properties.findByIdAndUpdate(booking.property_id, { status: 'active' });
    }

    const { broker_id, property_admin_id, status, customer_id } = req.query;
    let match = {};
    if (broker_id && mongoose.Types.ObjectId.isValid(broker_id)) match.broker_id = new mongoose.Types.ObjectId(broker_id);
    if (customer_id && mongoose.Types.ObjectId.isValid(customer_id)) match.customer_id = new mongoose.Types.ObjectId(customer_id);
    if (status) match.status = status;

    const bookings = await BrokerTemporaryBookings.aggregate([
      { $match: match },
      { $lookup: { from: 'properties', let: { pid: '$property_id' }, pipeline: [{ $match: { $expr: { $eq: ['$_id', '$$pid'] } } }, { $project: { images: 0 } }], as: 'property' } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title', property_location: '$property.location', property_type: '$property.type', property_price: '$property.price', broker_name: '$broker.name', broker_phone: '$broker.phone' } },
      { $project: { property: 0 } },
      { $sort: { booking_time: -1 } }
    ]);
    res.json(bookings);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/confirm', async (req, res) => {
  try {
    await BrokerTemporaryBookings.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
    const booking = await BrokerTemporaryBookings.findById(req.params.id);
    if (booking && booking.broker_id) {
      try { await Notifications.create({ user_id: booking.broker_id, title: 'Booking Confirmed', message: `Your booking has been confirmed.`, type: 'success' }); } catch(e) {}
    }
    res.json({ message: 'Booking confirmed successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await BrokerTemporaryBookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    await BrokerTemporaryBookings.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    await Properties.findByIdAndUpdate(booking.property_id, { status: 'active' });
    if (booking.broker_id) {
      try { await Notifications.create({ user_id: booking.broker_id, title: 'Booking Cancelled', message: `Your booking was cancelled by admin.`, type: 'error' }); } catch(e) {}
    }
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/extend', async (req, res) => {
  try {
    const booking = await BrokerTemporaryBookings.findById(req.params.id);
    if (booking) {
      booking.hold_expiry_time = new Date(booking.hold_expiry_time.getTime() + 30 * 60 * 1000);
      await booking.save();
    }
    res.json({ message: 'Hold time extended by 30 minutes' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const booking = await BrokerTemporaryBookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Always release the property back to active status when a booking is deleted
    await Properties.findByIdAndUpdate(booking.property_id, { status: 'active' });
    
    await BrokerTemporaryBookings.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted and property returned to active status' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
