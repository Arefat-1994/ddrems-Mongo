const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// GENERATE AGREEMENT
// ============================================================================

router.post('/:agreementId/generate', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, template_id } = req.body;

    // Get agreement details
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    // Update status
    await db.query(
      'UPDATE agreement_requests SET status = "generated", updated_at = NOW() WHERE id = ?',
      [agreementId]
    );

    // Send notification to customer
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'agreement_generated', 
        'Agreement Generated', 
        'Your agreement has been generated. Please review and submit payment.')
    `, [agreementId, agreement[0].customer_id]);

    res.json({
      success: true,
      message: 'Agreement generated successfully',
      status: 'generated'
    });
  } catch (error) {
    console.error('Error generating agreement:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// SUBMIT PAYMENT
// ============================================================================

router.post('/:agreementId/submit-payment', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { customer_id, payment_method, payment_amount, receipt_file_path } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    // Record payment
    await db.query(`
      INSERT INTO agreement_payments (
        agreement_id, payment_method, payment_amount,
        receipt_file_path, payment_date
      ) VALUES (?, ?, ?, ?, NOW())
    `, [agreementId, payment_method, payment_amount, receipt_file_path]);

    // Update agreement status
    await db.query(
      'UPDATE agreement_requests SET status = "payment_submitted", updated_at = NOW() WHERE id = ?',
      [agreementId]
    );

    // Notify admin
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'payment_submitted', 
        'Payment Submitted', 
        'Customer has submitted payment for agreement #' || ?)
    `, [agreementId, agreement[0].owner_id, agreementId]);

    res.json({
      success: true,
      message: 'Payment submitted successfully',
      status: 'payment_submitted'
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// UPLOAD RECEIPT
// ============================================================================

router.post('/:agreementId/upload-receipt', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { user_id, receipt_file_path, receipt_file_name } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    // Update receipt in payments table
    await db.query(`
      UPDATE agreement_payments SET
        receipt_file_path = ?,
        receipt_file_name = ?,
        receipt_uploaded_date = NOW()
      WHERE agreement_id = ?
      ORDER BY payment_date DESC LIMIT 1
    `, [receipt_file_path, receipt_file_name, agreementId]);

    // Notify admin
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'receipt_uploaded', 
        'Receipt Uploaded', 
        'Customer has uploaded receipt for agreement #' || ?)
    `, [agreementId, agreement[0].owner_id, agreementId]);

    res.json({
      success: true,
      message: 'Receipt uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// SEND AGREEMENT
// ============================================================================

router.post('/:agreementId/send-agreement', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, recipient_id } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    // Get recipient name
    const [recipient] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [recipient_id]
    );

    // Send notification
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'agreement_sent', 
        'Agreement Sent', 
        'An agreement has been sent to you for review and signature.')
    `, [agreementId, recipient_id]);

    res.json({
      success: true,
      message: `Agreement sent to ${recipient[0]?.name || 'recipient'} successfully`
    });
  } catch (error) {
    console.error('Error sending agreement:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// SEND NOTIFICATION
// ============================================================================

router.post('/:agreementId/notify', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { user_id, notification_message } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    // Send notification to all parties
    const recipients = [agreement[0].customer_id, agreement[0].owner_id];

    for (const recipient_id of recipients) {
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'custom_notification', 
          'Agreement Update', ?)
      `, [agreementId, recipient_id, notification_message]);
    }

    res.json({
      success: true,
      message: 'Notification sent to all parties'
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// GET AGREEMENT NOTIFICATIONS
// ============================================================================

router.get('/:agreementId/notifications', async (req, res) => {
  try {
    const { agreementId } = req.params;

    const [notifications] = await db.query(`
      SELECT * FROM agreement_notifications
      WHERE agreement_id = ?
      ORDER BY created_at DESC
    `, [agreementId]);

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

module.exports = router;
