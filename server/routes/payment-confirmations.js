const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Create payment confirmation
router.post('/', async (req, res) => {
  try {
    const { agreement_request_id, amount, payment_method, payment_reference, receipt_document, confirmed_by } = req.body;

    // Validate required fields
    if (!agreement_request_id || !amount || !payment_method || !payment_reference) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify agreement request exists
    const [requests] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreement_request_id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Agreement request not found'
      });
    }

    // Create payment confirmation
    const [result] = await db.query(`
      INSERT INTO payment_confirmations (
        agreement_request_id, amount, payment_method, payment_reference, 
        receipt_document, confirmed_by, status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `, [agreement_request_id, amount, payment_method, payment_reference, receipt_document, confirmed_by]);

    // Update agreement request with payment confirmation
    await db.query(
      `UPDATE agreement_requests 
       SET payment_confirmed = TRUE, payment_receipt_id = ?
       WHERE id = ?`,
      [result.insertId, agreement_request_id]
    );

    // Create notification for broker/owner
    const request = requests[0];
    const recipientId = request.broker_id || request.owner_id;
    
    if (recipientId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Payment Confirmed', ?, 'success')`,
        [recipientId, `Payment of ${amount} has been confirmed for property agreement`]
      );
    }

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Payment confirmed successfully'
    });
  } catch (error) {
    console.error('Error creating payment confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment',
      error: error.message
    });
  }
});

// Get payment confirmation by ID
router.get('/:id', async (req, res) => {
  try {
    const [confirmations] = await db.query(
      'SELECT * FROM payment_confirmations WHERE id = ?',
      [req.params.id]
    );

    if (confirmations.length === 0) {
      return res.status(404).json({ message: 'Payment confirmation not found' });
    }

    res.json(confirmations[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment confirmations for agreement request
router.get('/agreement/:agreementRequestId', async (req, res) => {
  try {
    const [confirmations] = await db.query(
      'SELECT * FROM payment_confirmations WHERE agreement_request_id = ? ORDER BY confirmed_at DESC',
      [req.params.agreementRequestId]
    );

    res.json(confirmations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get payment confirmations for user
router.get('/user/:userId', async (req, res) => {
  try {
    const [confirmations] = await db.query(`
      SELECT pc.*, ar.property_id, ar.customer_id, ar.broker_id, ar.owner_id
      FROM payment_confirmations pc
      JOIN agreement_requests ar ON pc.agreement_request_id = ar.id
      WHERE ar.customer_id = ? OR ar.broker_id = ? OR ar.owner_id = ?
      ORDER BY pc.confirmed_at DESC
    `, [req.params.userId, req.params.userId, req.params.userId]);

    res.json(confirmations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update payment confirmation status
router.put('/:id', async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await db.query(
      'UPDATE payment_confirmations SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    res.json({ message: 'Payment confirmation updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete payment confirmation
router.delete('/:id', async (req, res) => {
  try {
    const [confirmations] = await db.query(
      'SELECT agreement_request_id FROM payment_confirmations WHERE id = ?',
      [req.params.id]
    );

    if (confirmations.length === 0) {
      return res.status(404).json({ message: 'Payment confirmation not found' });
    }

    const agreementRequestId = confirmations[0].agreement_request_id;

    // Delete payment confirmation
    await db.query('DELETE FROM payment_confirmations WHERE id = ?', [req.params.id]);

    // Update agreement request
    await db.query(
      'UPDATE agreement_requests SET payment_confirmed = FALSE, payment_receipt_id = NULL WHERE id = ?',
      [agreementRequestId]
    );

    res.json({ message: 'Payment confirmation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
