const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail, templates } = require('../services/emailService');

// Create a new booking (Broker or Customer)
router.post('/', async (req, res) => {
  try {
    const { 
      property_id, broker_id, customer_id, buyer_name, phone, email, profile_photo,
      id_type, id_number, document_status, preferred_visit_time, notes 
    } = req.body;

    // Check if property is already reserved
    const [property] = await db.query('SELECT title, status, property_admin_id FROM properties WHERE id = ?', [property_id]);
    
    if (!property.length) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    if (property[0].status === 'reserved') {
      return res.status(400).json({ message: 'Property is already reserved' });
    }

    let finalCustomerId = customer_id;
    let tempPassword = null;

    // If no customer_id but email is provided, check if user exists or create new
    if (!finalCustomerId && email) {
      const [existingUsers] = await db.query('SELECT id, name FROM users WHERE email = ?', [email]);
      
      if (existingUsers.length > 0) {
        finalCustomerId = existingUsers[0].id;
      } else {
        // Create NEW Customer account
        tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        // Insert into users - Initially inactive and unapproved as per workflow
        const [userResult] = await db.query(
          'INSERT INTO users (name, email, phone, password, role, profile_approved, profile_completed, status) VALUES (?, ?, ?, ?, ?, FALSE, FALSE, \'inactive\') RETURNING id',
          [buyer_name, email, phone, hashedPassword, 'user']
        );
        finalCustomerId = userResult.insertId;

        // Create into customer_profiles - Initially pending
        await db.query(
          'INSERT INTO customer_profiles (user_id, full_name, phone_number, profile_photo, profile_status) VALUES (?, ?, ?, ?, \'pending\')',
          [finalCustomerId, buyer_name, phone, profile_photo]
        );
      }
    }

    // Set hold expiry to 30 minutes from now
    const property_admin_id = property[0].property_admin_id || null;

    const [result] = await db.query(
      `INSERT INTO broker_temporary_bookings 
        (property_id, broker_id, customer_id, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes, hold_expiry_time) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + interval '30 minutes') RETURNING id, hold_expiry_time`,
      [property_id, broker_id || null, finalCustomerId || null, property_admin_id, buyer_name, phone, id_type, id_number, document_status, preferred_visit_time, notes]
    );

    const bookingId = result.insertId;
    const hold_expiry_time = result.rows[0].hold_expiry_time;

    // Update property status to reserved
    await db.query('UPDATE properties SET status = ? WHERE id = ?', ['reserved', property_id]);

    // Send Email Notifications
    if (email) {
      if (tempPassword) {
        // Invitation for new user
        const emailData = templates.bookingInvitation(buyer_name, property[0].title, tempPassword, email);
        await sendEmail(email, emailData.subject, emailData.html);
      } else {
        // Confirmation for existing user
        const emailData = templates.bookingConfirmation(buyer_name, property[0].title, bookingId);
        await sendEmail(email, emailData.subject, emailData.html);
      }
    }

    // Internal notification for property admin
    const notificationMessage = `Booking reserved for property: ${property[0].title} (Buyer: ${buyer_name})`;
    if (property_admin_id) {
      console.log(`[SERVER] Sending notification to admin: ${property_admin_id}`);
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [property_admin_id, 'Property Reserved', notificationMessage, 'info']
      );
    }

    console.log(`[SERVER] Booking successful: ${bookingId}`);
    res.status(201).json({ 
      message: 'Booking created successfully', 
      booking_id: bookingId,
      hold_expiry_time: hold_expiry_time
    });
  } catch (error) {
    console.error('CRITICAL ERROR IN BOOKING:', error);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      detail: error.detail || 'No additional details'
    });
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
      LEFT JOIN users br ON b.broker_id = br.id
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
