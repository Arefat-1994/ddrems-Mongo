const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { AgreementRequests, Agreements, AgreementDocuments, AgreementNotifications, PaymentConfirmations, Notifications } = require('../models');
const { upload } = require('../middleware/upload');

router.post('/:agreementId/generate', async (req, res) => {
  try {
    const request = await AgreementRequests.findById(req.params.agreementId);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    const agreement = await Agreements.create({
      property_id: request.property_id,
      owner_id: request.owner_id,
      customer_id: request.customer_id,
      status: 'draft'
    });
    
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { status: 'agreement_generated', updated_at: new Date() });
    
    res.json({ message: 'Agreement generated successfully', success: true, agreement_id: agreement._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/submit-payment', async (req, res) => {
  try {
    const { amount, payment_method, payment_reference } = req.body;
    await PaymentConfirmations.create({
      agreement_request_id: req.params.agreementId,
      amount,
      payment_method,
      payment_reference,
      status: 'pending',
      created_at: new Date()
    });
    
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { status: 'payment_submitted', updated_at: new Date() });
    res.json({ message: 'Payment submitted for verification', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    let receipt_path = '';
    if (req.file) receipt_path = req.file.path;

    await PaymentConfirmations.findOneAndUpdate(
      { agreement_request_id: req.params.agreementId },
      { receipt_document: receipt_path, updated_at: new Date() },
      { upsert: true }
    );
    
    res.json({ message: 'Receipt uploaded successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/send-agreement', async (req, res) => {
  try {
    const { recipient_id, notification_title, notification_message } = req.body;
    await AgreementNotifications.create({
      agreement_request_id: req.params.agreementId,
      recipient_id,
      notification_type: 'agreement_sent',
      notification_title: notification_title || 'New Agreement Sent',
      notification_message: notification_message || 'An agreement has been sent for your review.',
      is_read: false,
      sent_date: new Date(),
      created_at: new Date()
    });
    
    res.json({ message: 'Agreement sent successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/notify', async (req, res) => {
  try {
    const { recipient_id, notification_title, notification_message, notification_type } = req.body;
    await AgreementNotifications.create({
      agreement_request_id: req.params.agreementId,
      recipient_id,
      notification_type: notification_type || 'general_notification',
      notification_title,
      notification_message,
      is_read: false,
      sent_date: new Date(),
      created_at: new Date()
    });
    
    res.json({ message: 'Notification sent successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:agreementId/notifications', async (req, res) => {
  try {
    const notifications = await AgreementNotifications.find({ agreement_request_id: req.params.agreementId }).sort({ sent_date: -1 }).lean();
    res.json(notifications.map(n => ({ ...n, id: n._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
