const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PaymentConfirmations, AgreementRequests } = require('../models');

// Mock token generation
router.get('/token', async (req, res) => {
  try { res.json({ token: 'mock_token_' + Date.now() }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/stk-push', async (req, res) => {
  try {
    const { amount, phone, agreementId, reference } = req.body;
    res.json({ message: 'STK Push sent successfully (Mock)', success: true, CheckoutRequestID: 'ws_CO_' + Date.now() });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/callback', async (req, res) => {
  try {
    // Handle M-Pesa callback mock
    res.json({ message: 'Success', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/confirm-payment', async (req, res) => {
  try {
    const { agreementId, amount, transactionId } = req.body;
    const newPayment = await PaymentConfirmations.create({
      agreement_request_id: agreementId,
      amount,
      payment_method: 'mpesa',
      payment_reference: transactionId,
      status: 'confirmed',
      confirmed_at: new Date(),
      created_at: new Date()
    });

    if (agreementId) {
      await AgreementRequests.findByIdAndUpdate(agreementId, { status: 'payment_verified', updated_at: new Date() });
    }

    res.json({ message: 'Payment confirmed successfully', success: true, payment_id: newPayment._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/b2c-payout', async (req, res) => {
  try { res.json({ message: 'Payout successful (Mock)', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/reverse', async (req, res) => {
  try { res.json({ message: 'Reversal successful (Mock)', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/status/:agreementId', async (req, res) => {
  try {
    const pc = await PaymentConfirmations.findOne({ agreement_request_id: req.params.agreementId }).sort({ created_at: -1 }).lean();
    if (!pc) return res.json({ status: 'pending' });
    res.json({ status: pc.status, details: pc });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await PaymentConfirmations.find({ payment_method: 'mpesa' }).sort({ created_at: -1 }).lean();
    res.json(transactions.map(t => ({ ...t, id: t._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
