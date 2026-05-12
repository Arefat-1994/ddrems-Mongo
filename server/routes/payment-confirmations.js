const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PaymentConfirmations, Notifications } = require('../models');
const { upload } = require('../middleware/upload');

router.post('/', upload.single('receipt'), async (req, res) => {
  try {
    const { agreement_request_id, amount, payment_method, payment_reference } = req.body;
    let receipt_document = '';
    if (req.file) receipt_document = req.file.path;

    const newPayment = await PaymentConfirmations.create({
      agreement_request_id,
      amount,
      payment_method,
      payment_reference,
      receipt_document,
      status: 'pending',
      created_at: new Date()
    });

    res.json({ message: 'Success', success: true, id: newPayment._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const pc = await PaymentConfirmations.findById(req.params.id).lean();
    if (!pc) return res.status(404).json({ message: 'Not found' });
    res.json({ ...pc, id: pc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/agreement/:agreementRequestId', async (req, res) => {
  try {
    const pc = await PaymentConfirmations.find({ agreement_request_id: req.params.agreementRequestId }).lean();
    res.json(pc.map(p => ({ ...p, id: p._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try { res.json([]); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, confirmed_by } = req.body;
    await PaymentConfirmations.findByIdAndUpdate(req.params.id, {
      status,
      confirmed_by,
      confirmed_at: new Date()
    });
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await PaymentConfirmations.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
