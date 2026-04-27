const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Create a new booking (Broker)
router.post('/', async (req, res) => {
  try {
    const { 
      property_id, broker_id, customer_id, buyer_name, phone, 
      id_type, id_number, document_status, preferred_visit_time, notes 
    } = req.body;

    // Check if property is already reserved
    const [property] = await db.query('SELECT status, property_admin_id FROM properties WHERE id = ?', [property_id]);
    
    if (!property.length) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property[0].status === 'reserved') {
      return res.status(400).json({ message: 'Property is already reserved' });
    }

    // Set hold expiry to 30 minutes from now
    // Since we are using postgres, we can use NOW() + interval '30 minutes'
    const property_admin_id = property[0].property_admin_id || null;

    const [result] = await db.query(
      `INSERT INTO broker_temporary_bookings 
        (property_id, broker_id, customer_id, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes, hold_expiry_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW() + interval '30 minutes') RETURNING id, hold_expiry_time`,
      [property_id, broker_id || null, customer_id || null, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes]
    );

    // Update property status to reserved
    await db.query('UPDATE properties SET status = $1 WHERE id = $2', ['reserved', property_id]);

    // Send notification to property admin if exists, else generic admins
    const notificationMessage = `Broker has reserved a property (ID: ${property_id}) for buyer ${buyer_name}. Please review within 30 minutes.`;
    if (property_admin_id) {
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [property_admin_id, 'Property Reserved', notificationMessage, 'info']
        );
    } else {
        const [admins] = await db.query("SELECT id FROM users WHERE role = 'property_admin' OR role = 'system_admin'");
        for (const admin of admins) {
            await db.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [admin.id, 'Property Reserved', notificationMessage, 'info']
            );
        }
    }

    res.status(201).json({ 
      message: 'Booking created successfully', 
      booking_id: result.insertId || (result[0] && result[0].id),
      hold_expiry_time: result[0] ? result[0].hold_expiry_time : null
    });
  } catch (error) {
    console.error('Error creating broker booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get bookings (filtered by broker_id or all for admins)
router.get('/', async (req, res) => {
  try {
    const { broker_id, property_admin_id, status } = req.query;
    let query = `
      SELECT b.*, p.title as property_title, p.location as property_location, p.type as property_type,
             p.price as property_price, br.name as broker_name, br.phone as broker_phone
      FROM broker_temporary_bookings b
      JOIN properties p ON b.property_id = p.id
      JOIN users br ON b.broker_id = br.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (broker_id) {
      query += ` AND b.broker_id = $${paramIndex++}`;
      params.push(broker_id);
    }
    if (req.query.customer_id) {
      query += ` AND b.customer_id = $${paramIndex++}`;
      params.push(req.query.customer_id);
    }
    if (property_admin_id) {
      query += ` AND (b.property_admin_id = $${paramIndex} OR b.property_admin_id IS NULL)`;
      params.push(property_admin_id);
      paramIndex++;
    }
    if (status) {
      query += ` AND b.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY b.booking_time DESC';

    const [bookings] = await db.query(query, params);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching broker bookings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Confirm a booking (Admin only)
router.put('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE broker_temporary_bookings SET status = 'confirmed' WHERE id = ?", [id]);
    
    // We leave the property status as 'reserved' so no one else can book it.
    // Or we could change it to 'in_agreement' if that status exists. For now, leave it 'reserved'.

    // Optional: Notify broker
    const [booking] = await db.query("SELECT broker_id, property_id FROM broker_temporary_bookings WHERE id = ?", [id]);
    if (booking.length) {
        await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [booking[0].broker_id, 'Booking Confirmed', `Your temporary booking for property ID ${booking[0].property_id} has been confirmed.`, 'success']
        );
    }

    res.json({ message: 'Booking confirmed successfully' });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel a booking (Admin only)
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get booking details
    const [booking] = await db.query('SELECT property_id, broker_id FROM broker_temporary_bookings WHERE id = ?', [id]);
    if (!booking.length) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Update booking status
    await db.query("UPDATE broker_temporary_bookings SET status = 'cancelled' WHERE id = ?", [id]);
    
    // Restore property to active
    await db.query("UPDATE properties SET status = 'active' WHERE id = ?", [booking[0].property_id]);

    // Notify broker
    await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [booking[0].broker_id, 'Booking Cancelled', `Your temporary booking for property ID ${booking[0].property_id} was cancelled by the admin.`, 'error']
    );

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Extend hold time (Admin only)
router.put('/:id/extend', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE broker_temporary_bookings SET hold_expiry_time = hold_expiry_time + interval '30 minutes' WHERE id = $1", [id]);
    res.json({ message: 'Hold time extended by 30 minutes' });
  } catch (error) {
    console.error('Error extending hold time:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
