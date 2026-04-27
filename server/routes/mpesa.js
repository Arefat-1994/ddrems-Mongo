const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { getToken, stkPush, b2cPayout, reverseTransaction } = require('../services/mpesa');
const { sendEmail, templates } = require('../services/emailService');

// ── GET /api/mpesa/token — Test token generation ──────────────────────────────
router.get('/token', async (req, res) => {
  try {
    const token = await getToken();
    res.json({
      success: true,
      token,
      token_preview: token.substring(0, 30) + '...',
      message: 'M-Pesa token generated successfully',
      credentials_used: {
        consumer_key_preview: (process.env.MPESA_CONSUMER_KEY || '').substring(0, 10) + '...',
        shortcode: process.env.MPESA_SHORTCODE,
        base_url: process.env.MPESA_BASE_URL
      }
    });
  } catch (err) {
    console.error('[M-Pesa] Token error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get M-Pesa token: ' + err.message,
      error_detail: err.response?.data
    });
  }
});

// ── POST /api/mpesa/stk-push — Initiate STK Push (buyer pays) ────────────────
// Called when buyer selects M-Pesa and clicks Pay Now
router.post('/stk-push', async (req, res) => {
  try {
    const { phone, amount, agreement_id, buyer_id, account_ref } = req.body;

    if (!phone || !amount || !agreement_id) {
      return res.status(400).json({ success: false, message: 'phone, amount, and agreement_id are required' });
    }

    // Normalize phone: ensure it starts with 251
    const normalizedPhone = phone.replace(/^0/, '251').replace(/^\+/, '');

    console.log(`[M-Pesa STK] Sending to phone: ${normalizedPhone}, amount: ${amount}, agreement: ${agreement_id}`);

    const result = await stkPush({
      phone: normalizedPhone,
      amount,
      accountRef: account_ref || `AGR-${agreement_id}`,
      description: `DDREMS Property Payment - Agreement #${agreement_id}`
    });

    console.log('[M-Pesa STK] Response:', JSON.stringify(result));

    // Check if Safaricom accepted the request
    const accepted = result.ResponseCode === '0' || result.ResponseCode === 0;

    // Save pending payment record
    try {
      await db.query(
        `INSERT INTO agreement_payments 
         (agreement_request_id, payment_method, payment_amount, transaction_reference, payment_status, payment_date)
         VALUES (?, 'mpesa', ?, ?, ?, NOW())
         ON CONFLICT DO NOTHING`,
        [agreement_id, amount, result.MerchantRequestID || result.CheckoutRequestID || `STK-${Date.now()}`,
         accepted ? 'pending_mpesa' : 'stk_failed']
      );
    } catch (dbErr) {
      // Try without ON CONFLICT for PostgreSQL
      try {
        await db.query(
          `INSERT INTO agreement_payments 
           (agreement_request_id, payment_method, payment_amount, transaction_reference, payment_status, payment_date)
           VALUES (?, 'mpesa', ?, ?, ?, NOW())`,
          [agreement_id, amount, result.MerchantRequestID || result.CheckoutRequestID || `STK-${Date.now()}`,
           accepted ? 'pending_mpesa' : 'stk_failed']
        );
      } catch (e2) { console.warn('[M-Pesa] Payment record insert skipped:', e2.message); }
    }

    // Save mpesa transaction log
    try {
      await db.query(
        `INSERT INTO mpesa_transactions 
         (agreement_id, buyer_id, phone, amount, merchant_request_id, checkout_request_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          agreement_id, buyer_id, normalizedPhone, amount,
          result.MerchantRequestID || null,
          result.CheckoutRequestID || null,
          accepted ? 'pending' : 'failed'
        ]
      );
    } catch (logErr) {
      console.warn('[M-Pesa] mpesa_transactions log skipped:', logErr.message);
    }

    if (!accepted) {
      return res.status(400).json({
        success: false,
        message: `M-Pesa rejected: ${result.ResponseDescription || result.CustomerMessage || 'Unknown error'}`,
        data: result
      });
    }

    res.json({
      success: true,
      message: '📱 STK Push sent! Check your phone to complete payment.',
      data: result,
      merchant_request_id: result.MerchantRequestID,
      checkout_request_id: result.CheckoutRequestID,
      response_code: result.ResponseCode,
      customer_message: result.CustomerMessage
    });
  } catch (err) {
    console.error('[M-Pesa] STK Push error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'M-Pesa STK Push failed: ' + (err.response?.data?.errorMessage || err.message),
      error: err.response?.data
    });
  }
});

// ── POST /api/mpesa/callback — M-Pesa sends payment result here ──────────────
router.post('/callback', async (req, res) => {
  try {
    const body = req.body;
    console.log('[M-Pesa Callback]', JSON.stringify(body, null, 2));

    const stkCallback = body?.Body?.stkCallback;
    if (stkCallback) {
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;
      const success = ResultCode === 0;

      // Update mpesa_transactions
      try {
        await db.query(
          `UPDATE mpesa_transactions SET status = ?, result_code = ?, result_desc = ?, updated_at = NOW()
           WHERE merchant_request_id = ? OR checkout_request_id = ?`,
          [success ? 'completed' : 'failed', ResultCode, ResultDesc, MerchantRequestID, CheckoutRequestID]
        );
      } catch (e) { console.warn('[M-Pesa] mpesa_transactions update skipped:', e.message); }

      if (success) {
        // Get the agreement_id from mpesa_transactions
        try {
          const [txRows] = await db.query(
            'SELECT agreement_id FROM mpesa_transactions WHERE merchant_request_id = ? OR checkout_request_id = ? LIMIT 1',
            [MerchantRequestID, CheckoutRequestID]
          );
          if (txRows.length > 0) {
            const agreementId = txRows[0].agreement_id;
            // Update agreement payment status
            await db.query(
              `UPDATE agreement_payments SET payment_status = 'pending_verification', transaction_reference = ?
               WHERE agreement_request_id = ? AND payment_status = 'pending_mpesa'`,
              [MerchantRequestID, agreementId]
            );
            await db.query(
              `UPDATE agreement_requests SET payment_submitted = TRUE, status = 'payment_submitted', current_step = 9, updated_at = NOW()
               WHERE id = ? AND status = 'fully_signed'`,
              [agreementId]
            );
            console.log(`[M-Pesa] Agreement #${agreementId} payment confirmed via callback`);

            // Notify user of payment receipt
            try {
              const [userRows] = await db.query(
                `SELECT u.name, u.email, ap.payment_amount 
                 FROM users u 
                 JOIN agreement_requests ar ON ar.tenant_id = u.id 
                 JOIN agreement_payments ap ON ap.agreement_request_id = ar.id
                 WHERE ar.id = ? LIMIT 1`,
                [agreementId]
              );
              if (userRows.length > 0) {
                const emailData = templates.paymentSuccess(userRows[0].name, userRows[0].payment_amount, MerchantRequestID);
                await sendEmail(userRows[0].email, emailData.subject, emailData.html);
              }
            } catch (e) { console.warn('[M-Pesa] Payment notification failed:', e.message); }
          }
        } catch (e) { console.warn('[M-Pesa] Agreement update from callback skipped:', e.message); }
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('[M-Pesa] Callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always return 0 to M-Pesa
  }
});

// ── POST /api/mpesa/confirm-payment — Admin manually confirms M-Pesa payment ─
router.post('/confirm-payment', async (req, res) => {
  try {
    const { agreement_id, admin_id, transaction_reference } = req.body;

    // Update payment to pending_verification so admin can verify
    await db.query(
      `UPDATE agreement_payments SET payment_status = 'pending_verification', transaction_reference = ?
       WHERE agreement_request_id = ? AND payment_method = 'mpesa'`,
      [transaction_reference || 'MPESA-CONFIRMED', agreement_id]
    );

    await db.query(
      `UPDATE agreement_requests SET payment_submitted = TRUE, status = 'payment_submitted', current_step = 9, updated_at = NOW()
       WHERE id = ?`,
      [agreement_id]
    );

    await db.query(
      `INSERT INTO agreement_workflow_history (agreement_request_id, step_number, step_name, action, action_by_id, previous_status, new_status, notes)
       VALUES (?, 9, 'M-Pesa Payment Confirmed', 'paid', ?, 'fully_signed', 'payment_submitted', 'Payment confirmed via M-Pesa STK Push')`,
      [agreement_id, admin_id || null]
    );

    // Notify user of payment receipt
    try {
      const [userRows] = await db.query(
        `SELECT u.name, u.email, ap.payment_amount 
         FROM users u 
         JOIN agreement_requests ar ON ar.tenant_id = u.id 
         JOIN agreement_payments ap ON ap.agreement_request_id = ar.id
         WHERE ar.id = ? LIMIT 1`,
        [agreement_id]
      );
      if (userRows.length > 0) {
        const emailData = templates.paymentSuccess(userRows[0].name, userRows[0].payment_amount, transaction_reference || 'MPESA-MANUAL');
        await sendEmail(userRows[0].email, emailData.subject, emailData.html);
      }
    } catch (e) { console.warn('[M-Pesa] Manual payment notification failed:', e.message); }

    res.json({ success: true, message: 'M-Pesa payment confirmed. Awaiting admin verification.' });
  } catch (err) {
    console.error('[M-Pesa] Confirm error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/mpesa/b2c-payout — Admin pays out to owner/broker ──────────────
router.post('/b2c-payout', async (req, res) => {
  try {
    const { phone, amount, agreement_id, admin_id, remarks } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'phone and amount are required' });
    }

    const normalizedPhone = phone.replace(/^0/, '251').replace(/^\+/, '');
    const result = await b2cPayout({
      phone: normalizedPhone,
      amount,
      remarks: remarks || `DDREMS Payout - Agreement #${agreement_id}`,
      occasion: 'PropertyPayout'
    });

    res.json({ success: true, message: '💸 B2C Payout initiated successfully', data: result });
  } catch (err) {
    console.error('[M-Pesa] B2C error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: 'B2C Payout failed: ' + (err.response?.data?.errorMessage || err.message)
    });
  }
});

// ── POST /api/mpesa/reverse — Reverse a transaction ──────────────────────────
router.post('/reverse', async (req, res) => {
  try {
    const { transaction_id, amount, receiver_phone } = req.body;
    const result = await reverseTransaction({ transactionId: transaction_id, amount, receiverPhone: receiver_phone });
    res.json({ success: true, message: 'Reversal initiated', data: result });
  } catch (err) {
    console.error('[M-Pesa] Reversal error:', err.response?.data || err.message);
    res.status(500).json({ success: false, message: 'Reversal failed: ' + err.message });
  }
});

// ── GET /api/mpesa/status/:agreementId — Check M-Pesa payment status ─────────
router.get('/status/:agreementId', async (req, res) => {
  try {
    const { agreementId } = req.params;

    // Check agreement_requests status
    const [agr] = await db.query(
      'SELECT status, payment_submitted, payment_verified FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    // Check latest payment record
    const [payments] = await db.query(
      `SELECT payment_status, transaction_reference, payment_method, payment_amount, payment_date
       FROM agreement_payments WHERE agreement_request_id = ? ORDER BY id DESC LIMIT 1`,
      [agreementId]
    );

    // Check mpesa_transactions
    const [mpesaTx] = await db.query(
      `SELECT status, result_code, result_desc, merchant_request_id, phone, amount, created_at
       FROM mpesa_transactions WHERE agreement_id = ? ORDER BY id DESC LIMIT 1`,
      [agreementId]
    );

    res.json({
      success: true,
      agreement_status: agr[0]?.status || 'unknown',
      payment_submitted: agr[0]?.payment_submitted || false,
      payment_verified: agr[0]?.payment_verified || false,
      payment: payments[0] || null,
      mpesa_transaction: mpesaTx[0] || null
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/mpesa/transactions — List all M-Pesa transactions ────────────────
router.get('/transactions', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mt.*, ar.status as agreement_status, p.title as property_title
       FROM mpesa_transactions mt
       LEFT JOIN agreement_requests ar ON ar.id = mt.agreement_id
       LEFT JOIN properties p ON p.id = ar.property_id
       ORDER BY mt.created_at DESC LIMIT 50`
    );
    res.json({ success: true, transactions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
