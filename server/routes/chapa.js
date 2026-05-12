const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PaymentConfirmations, AgreementRequests, BrokerEngagements, Notifications } = require('../models');
const crypto = require('crypto');

// Node 18+ has built-in fetch. If running on older node, might need node-fetch.
// Assuming fetch is available.

// Helper: Notify user
async function notifyUser(userId, title, message, type) {
  try {
    await Notifications.create({
      user_id: userId,
      title,
      message,
      type: type || "info",
      created_at: new Date()
    });
  } catch (error) {
    console.error("Error in notifyUser:", error);
  }
}

router.post('/initialize', async (req, res) => {
  try {
    const { amount, email, first_name, last_name, agreementId, engagementId, returnUrl } = req.body;

    // Chapa test mode has a 100,000 ETB max per transaction
    const numAmount = Number(amount);
    if (numAmount > 100000) {
      return res.status(400).json({
        success: false,
        message: `Amount ${numAmount.toLocaleString()} ETB exceeds Chapa's maximum of 100,000 ETB per transaction. Please contact admin for alternative payment arrangements.`
      });
    }
    
    // Generate a unique transaction reference
    const tx_ref = `tx-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Determine the source type (agreement or broker engagement)
    const sourceType = engagementId ? 'broker_engagement' : 'agreement';
    const sourceId = engagementId || agreementId;

    const payload = {
      amount: numAmount.toString(),
      currency: "ETB",
      email: email || "payment@gmail.com",
      first_name: first_name || "Customer",
      last_name: last_name || "Name",
      tx_ref: tx_ref,
      callback_url: `http://${req.headers.host}/api/chapa/callback`,
      return_url: `${returnUrl}?tx_ref=${tx_ref}&agreementId=${sourceId}&sourceType=${sourceType}`,
      customization: {
        title: "DDREMS Payment",
        description: "Payment for property agreement"
      }
    };

    // Save initial pending state
    if (sourceId) {
      const paymentData = {
        amount: numAmount,
        payment_method: 'chapa',
        payment_reference: tx_ref,
        status: 'pending',
        created_at: new Date()
      };

      if (sourceType === 'broker_engagement') {
        paymentData.broker_engagement_id = sourceId;
      } else {
        paymentData.agreement_request_id = sourceId;
      }

      await PaymentConfirmations.create(paymentData);
    }

    const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.status === "success") {
      res.json({ success: true, checkout_url: data.data.checkout_url, tx_ref });
    } else {
      // Chapa returns errors as objects like {amount: ["must not exceed..."]}
      // Flatten them into a readable string for the frontend
      let errMsg = data.message;
      if (typeof errMsg === 'object' && errMsg !== null) {
        errMsg = Object.values(errMsg).flat().join('; ');
      }
      res.status(400).json({ success: false, message: errMsg || 'Chapa initialization failed' });
    }
  } catch (error) {
    console.error("Chapa Initialize Error:", error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

router.get('/verify/:tx_ref', async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const response = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.CHAPA_SECRET_KEY}`
      }
    });

    const data = await response.json();

    if (data.status === "success" && data.data.status === "success") {
      // Find the pending payment
      const payment = await PaymentConfirmations.findOne({ payment_reference: tx_ref });
      
      if (payment && payment.status !== 'confirmed') {
        payment.status = 'confirmed';
        payment.confirmed_at = new Date();
        payment.chapa_response = JSON.stringify(data.data);
        await payment.save();

        // Update the source (agreement or broker engagement) to payment_submitted
        // This means admin still needs to verify, but payment went through Chapa
        if (payment.agreement_request_id) {
          const agr = await AgreementRequests.findById(payment.agreement_request_id);
          if (agr && ['media_viewed', 'payment_rejected'].includes(agr.status)) {
            agr.status = 'payment_submitted';
            agr.current_step = 10;
            agr.payment_method = 'chapa';
            agr.payment_reference = tx_ref;
            agr.payment_amount = Number(data.data.amount);
            agr.updated_at = new Date();
            await agr.save();

            // Notify admin
            const adminUser = await require('../models').Users.findOne({ role: { $in: ['property_admin', 'system_admin'] } });
            if (adminUser) {
              await notifyUser(adminUser._id, "💰 Chapa Payment Received",
                `A Chapa payment of ${Number(data.data.amount).toLocaleString()} ETB has been received for Agreement #${payment.agreement_request_id}. Please verify.`, "warning");
            }
          }
        }

        if (payment.broker_engagement_id) {
          const eng = await BrokerEngagements.findById(payment.broker_engagement_id);
          if (eng && ['media_viewed', 'payment_rejected'].includes(eng.status)) {
            eng.status = 'payment_submitted';
            eng.payment_method = 'chapa';
            eng.payment_reference = tx_ref;
            eng.payment_submitted_at = new Date();
            eng.updated_at = new Date();
            await eng.save();

            // Notify admin
            const adminUser = await require('../models').Users.findOne({ role: { $in: ['property_admin', 'system_admin'] } });
            if (adminUser) {
              await notifyUser(adminUser._id, "💰 Chapa Payment Received",
                `A Chapa payment of ${Number(data.data.amount).toLocaleString()} ETB has been received for Engagement #${payment.broker_engagement_id}. Please verify.`, "warning");
            }
          }
        }
      }
      
      res.json({ success: true, data: data.data, payment });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed', data });
    }
  } catch (error) {
    console.error("Chapa Verify Error:", error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/chapa/upload-receipt
// Customer uploads downloaded receipt back to their agreement/engagement
router.post('/upload-receipt', async (req, res) => {
  try {
    const { tx_ref, agreementId, engagementId, receipt_document, user_id } = req.body;

    if (!tx_ref && !agreementId && !engagementId) {
      return res.status(400).json({ success: false, message: 'Missing transaction reference or agreement/engagement ID' });
    }

    // Find the payment confirmation
    const payment = await PaymentConfirmations.findOne({ payment_reference: tx_ref });
    if (payment) {
      payment.receipt_document = receipt_document;
      payment.updated_at = new Date();
      await payment.save();
    }

    // Update the agreement/engagement with receipt
    if (agreementId) {
      await AgreementRequests.findByIdAndUpdate(agreementId, {
        receipt_document: receipt_document,
        payment_reference: tx_ref,
        updated_at: new Date()
      });
    }

    if (engagementId) {
      await BrokerEngagements.findByIdAndUpdate(engagementId, {
        payment_receipt: receipt_document,
        payment_reference: tx_ref,
        updated_at: new Date()
      });
    }

    res.json({ success: true, message: 'Receipt uploaded successfully to your agreement.' });
  } catch (error) {
    console.error("Receipt Upload Error:", error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/callback', async (req, res) => {
  // Chapa webhook callback
  try {
    const { tx_ref, status } = req.body;

    if (status === 'success' && tx_ref) {
      const payment = await PaymentConfirmations.findOne({ payment_reference: tx_ref });
      if (payment && payment.status !== 'confirmed') {
        payment.status = 'confirmed';
        payment.confirmed_at = new Date();
        await payment.save();

        // Update agreement/engagement status
        if (payment.agreement_request_id) {
          const agr = await AgreementRequests.findById(payment.agreement_request_id);
          if (agr && ['media_viewed', 'payment_rejected'].includes(agr.status)) {
            agr.status = 'payment_submitted';
            agr.current_step = 10;
            agr.payment_method = 'chapa';
            agr.payment_reference = tx_ref;
            agr.updated_at = new Date();
            await agr.save();
          }
        }

        if (payment.broker_engagement_id) {
          const eng = await BrokerEngagements.findById(payment.broker_engagement_id);
          if (eng && ['media_viewed', 'payment_rejected'].includes(eng.status)) {
            eng.status = 'payment_submitted';
            eng.payment_method = 'chapa';
            eng.payment_reference = tx_ref;
            eng.payment_submitted_at = new Date();
            eng.updated_at = new Date();
            await eng.save();
          }
        }
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Chapa Callback Error:", error);
    res.status(500).send("Error");
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await PaymentConfirmations.find({ payment_method: 'chapa' }).sort({ created_at: -1 }).lean();
    res.json(transactions.map(t => ({ ...t, id: t._id })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
