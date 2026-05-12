const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { AgreementRequests, Agreements, Notifications } = require('../models');

router.post('/request', async (req, res) => {
  try {
    const { property_id, customer_id, request_message } = req.body;
    const newReq = await AgreementRequests.create({
      property_id,
      customer_id,
      customer_notes: request_message,
      status: 'pending',
      request_date: new Date()
    });
    res.json({ message: 'Success', success: true, id: newReq._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/customer/:customerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.customerId)) return res.json([]);
    const requests = await AgreementRequests.find({ customer_id: req.params.customerId }).sort({ request_date: -1 }).lean();
    res.json(requests.map(r => ({ ...r, id: r._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/submit-payment', async (req, res) => {
  try {
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { status: 'payment_submitted', updated_at: new Date() });
    res.json({ message: 'Success', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/admin/pending', async (req, res) => {
  try {
    const requests = await AgreementRequests.find({ status: 'pending' }).sort({ request_date: -1 }).lean();
    res.json(requests.map(r => ({ ...r, id: r._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/generate', async (req, res) => {
  try {
    const request = await AgreementRequests.findById(req.params.agreementId);
    if (!request) return res.status(404).json({ message: 'Not found' });
    
    const ag = await Agreements.create({
      property_id: request.property_id,
      owner_id: request.owner_id,
      customer_id: request.customer_id,
      status: 'draft'
    });
    
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { status: 'agreement_generated', updated_at: new Date() });
    res.json({ message: 'Success', success: true, agreement_id: ag._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/forward-to-owner', async (req, res) => {
  try {
    const request = await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { 
      status: 'forwarded', 
      forwarded_to_owner_date: new Date(),
      updated_at: new Date() 
    });
    
    if (request && request.owner_id) {
      await Notifications.create({
        user_id: request.owner_id,
        type: 'agreement_forwarded',
        message: 'A new agreement request has been forwarded to you.',
        created_at: new Date()
      });
    }
    
    res.json({ message: 'Success', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/verify-payment', async (req, res) => {
  try {
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { status: 'payment_verified', updated_at: new Date() });
    res.json({ message: 'Success', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/owner/:ownerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.ownerId)) return res.json([]);
    const requests = await AgreementRequests.find({ owner_id: req.params.ownerId }).sort({ request_date: -1 }).lean();
    res.json(requests.map(r => ({ ...r, id: r._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:agreementId/owner-response', async (req, res) => {
  try {
    const { status, response_message } = req.body;
    await AgreementRequests.findByIdAndUpdate(req.params.agreementId, { 
      status, 
      response_message,
      responded_at: new Date(),
      updated_at: new Date() 
    });
    res.json({ message: 'Success', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
