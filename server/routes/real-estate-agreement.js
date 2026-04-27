const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// CUSTOMER ENDPOINTS
// ============================================================================

// 1. Request Agreement for a Property
router.post('/request', async (req, res) => {
  try {
    const { property_id, customer_notes } = req.body;
    const customer_id = req.user?.id || req.body.customer_id;

    if (!property_id || !customer_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get property details
    const [property] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [property_id]
    );

    if (!property || property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const prop = property[0];

    // Get property admin (static single admin)
    const [admins] = await db.query(
      "SELECT id FROM users WHERE role = 'property_admin' LIMIT 1"
    );

    if (!admins || admins.length === 0) {
      return res.status(400).json({ message: 'No property admin available' });
    }

    const property_admin_id = admins[0].id;
    
    // Determine owner_id - use property owner or broker, fallback to property_admin
    const owner_id = prop.owner_id || prop.broker_id || property_admin_id;

    // Create agreement request
    const [result] = await db.query(
      `INSERT INTO agreement_requests 
       (property_id, customer_id, owner_id, property_admin_id, customer_notes, status, request_date)
       VALUES (?, ?, ?, ?, ?, 'pending_admin_review', NOW())`,
      [property_id, customer_id, owner_id, property_admin_id, customer_notes]
    );

    // Create notification for admin
    await db.query(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'request_received', 'New Agreement Request', ?, NOW())`,
      [result.insertId, property_admin_id, `New agreement request for property: ${prop.title}`]
    );

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'REQUEST_CREATED', 'Customer requested agreement', ?, 'pending_admin_review', NOW())`,
      [result.insertId, customer_id]
    );

    res.json({
      message: 'Agreement request created successfully',
      agreement_id: result.insertId
    });
  } catch (error) {
    console.error('Error creating agreement request:', error);
    res.status(500).json({ message: 'Error creating agreement request', error: error.message });
  }
});

// 2. Get Customer's Agreements
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const [agreements] = await db.query(
      `SELECT ar.*, p.title as property_title, p.location as property_location, 
              p.price as property_price, p.type as property_type,
              u_cust.name as customer_name, u_owner.name as owner_name
       FROM agreement_requests ar
       JOIN properties p ON ar.property_id = p.id
       JOIN users u_cust ON ar.customer_id = u_cust.id
       LEFT JOIN users u_owner ON ar.owner_id = u_owner.id
       WHERE ar.customer_id = ?
       ORDER BY ar.request_date DESC`,
      [customerId]
    );

    res.json(agreements || []);
  } catch (error) {
    console.error('Error fetching customer agreements:', error);
    res.status(500).json({ message: 'Error fetching agreements', error: error.message });
  }
});

// 3. Submit Payment
router.post('/:agreementId/submit-payment', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { payment_method, payment_amount, receipt_file_path } = req.body;
    const customer_id = req.user?.id || req.body.customer_id;

    // Create payment receipt
    const [result] = await db.query(
      `INSERT INTO payment_receipts 
       (agreement_request_id, payment_method, payment_amount, receipt_file_path, verification_status, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [agreementId, payment_method, payment_amount, receipt_file_path]
    );

    // Update agreement status
    await db.query(
      "UPDATE agreement_requests SET status = 'payment_submitted', updated_at = NOW() WHERE id = ?",
      [agreementId]
    );

    // Create notification
    const [agreement] = await db.query(
      'SELECT property_admin_id FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement && agreement.length > 0) {
      await db.query(
        `INSERT INTO agreement_notifications 
         (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
         VALUES (?, ?, 'payment_submitted', 'Payment Submitted', 'Customer submitted payment for agreement', NOW())`,
        [agreementId, agreement[0].property_admin_id]
      );
    }

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'PAYMENT_SUBMITTED', 'Customer submitted payment', ?, 'payment_submitted', NOW())`,
      [agreementId, customer_id]
    );

    res.json({
      message: 'Payment submitted successfully',
      receipt_id: result.insertId
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ message: 'Error submitting payment', error: error.message });
  }
});

// ============================================================================
// PROPERTY ADMIN ENDPOINTS
// ============================================================================

// 4. Get Pending Agreements for Admin
router.get('/admin/pending', async (req, res) => {
  try {
    const admin_id = req.user?.id || req.query.admin_id;

    const [agreements] = await db.query(
      `SELECT ar.*, p.title as property_title, p.location as property_location, 
              p.price as property_price, p.type as property_type,
              u_cust.name as customer_name, u_owner.name as owner_name
       FROM agreement_requests ar
       JOIN properties p ON ar.property_id = p.id
       JOIN users u_cust ON ar.customer_id = u_cust.id
       LEFT JOIN users u_owner ON ar.owner_id = u_owner.id
       WHERE ar.property_admin_id = ? AND ar.status IN ('pending_admin_review', 'submitted_by_customer')
       ORDER BY ar.request_date ASC`,
      [admin_id]
    );

    res.json(agreements || []);
  } catch (error) {
    console.error('Error fetching pending agreements:', error);
    res.status(500).json({ message: 'Error fetching agreements', error: error.message });
  }
});

// 5. Generate Agreement Document
router.post('/:agreementId/generate', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const admin_id = req.user?.id || req.body.admin_id;

    // Get agreement details
    const [agreements] = await db.query(
      `SELECT ar.*, p.title, p.location, p.price, p.type, p.area, p.description,
              u_cust.name as customer_name, u_owner.name as owner_name
       FROM agreement_requests ar
       JOIN properties p ON ar.property_id = p.id
       JOIN users u_cust ON ar.customer_id = u_cust.id
       LEFT JOIN users u_owner ON ar.owner_id = u_owner.id
       WHERE ar.id = ?`,
      [agreementId]
    );

    if (!agreements || agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const agreement = agreements[0];

    // Generate HTML document
    const documentHTML = generateAgreementHTML(agreement);

    // Store document
    const [result] = await db.query(
      `INSERT INTO agreement_documents 
       (agreement_request_id, version, document_type, document_content, generated_by_id, generated_date)
       VALUES (?, 1, 'initial', ?, ?, NOW())`,
      [agreementId, documentHTML, admin_id]
    );

    // Update agreement status
    await db.query(
      "UPDATE agreement_requests SET status = 'forwarded_to_owner', forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?",
      [agreementId]
    );

    // Create notification for owner
    await db.query(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'agreement_forwarded', 'Agreement Forwarded', 'Agreement has been forwarded for your review', NOW())`,
      [agreementId, agreement.owner_id]
    );

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'AGREEMENT_GENERATED', 'Admin generated agreement document', ?, 'pending_admin_review', 'forwarded_to_owner', NOW())`,
      [agreementId, admin_id]
    );

    res.json({
      message: 'Agreement generated successfully',
      document_id: result.insertId
    });
  } catch (error) {
    console.error('Error generating agreement:', error);
    res.status(500).json({ message: 'Error generating agreement', error: error.message });
  }
});

// 6. Forward Agreement to Owner
router.post('/:agreementId/forward-to-owner', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const admin_id = req.user?.id || req.body.admin_id;

    // Get agreement
    const [agreements] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (!agreements || agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const agreement = agreements[0];

    // Update status
    await db.query(
      "UPDATE agreement_requests SET status = 'forwarded_to_owner', forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?",
      [agreementId]
    );

    // Create notification
    await db.query(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'agreement_forwarded', 'Agreement Forwarded', 'Agreement forwarded for your review', NOW())`,
      [agreementId, agreement.owner_id]
    );

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'FORWARDED_TO_OWNER', 'Admin forwarded agreement to owner', ?, 'pending_admin_review', 'forwarded_to_owner', NOW())`,
      [agreementId, admin_id]
    );

    res.json({ message: 'Agreement forwarded to owner successfully' });
  } catch (error) {
    console.error('Error forwarding agreement:', error);
    res.status(500).json({ message: 'Error forwarding agreement', error: error.message });
  }
});

// 7. Verify Payment
router.post('/:agreementId/verify-payment', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { verification_status, verification_notes } = req.body;
    const admin_id = req.user?.id || req.body.admin_id;

    // Update payment receipt
    await db.query(
      `UPDATE payment_receipts SET verification_status = ?, verification_notes = ?, verified_by_id = ?, verification_date = NOW()
       WHERE agreement_request_id = ?`,
      [verification_status, verification_notes, admin_id, agreementId]
    );

    // If verified, calculate commission
    if (verification_status === 'verified') {
      const [agreements] = await db.query(
        'SELECT * FROM agreement_requests WHERE id = ?',
        [agreementId]
      );

      if (agreements && agreements.length > 0) {
        const agreement = agreements[0];
        const [properties] = await db.query(
          'SELECT price FROM properties WHERE id = ?',
          [agreement.property_id]
        );

        if (properties && properties.length > 0) {
          const price = properties[0].price;
          const customer_commission = (price * 5) / 100;
          const owner_commission = (price * 5) / 100;
          const total_commission = customer_commission + owner_commission;

          // Store commission in agreement_commissions
          await db.query(
            `INSERT INTO agreement_commissions 
             (agreement_request_id, commission_type, property_price, commission_percentage, commission_amount, payment_status, calculated_by_id)
             VALUES (?, 'platform', ?, 5, ?, 'recorded', ?)`,
            [agreementId, price, total_commission, admin_id]
          );

          // Update agreement status
          await db.query(
            "UPDATE agreement_requests SET status = 'completed', completed_date = NOW(), updated_at = NOW() WHERE id = ?",
            [agreementId]
          );

          // Create notifications
          const { customer_id, owner_id } = agreement;

          if (customer_id) {
            await db.query(
              `INSERT INTO agreement_notifications 
               (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
               VALUES (?, ?, 'payment_verified', 'Payment Verified', 'Your payment has been verified', NOW())`,
              [agreementId, customer_id]
            );
          }

          if (owner_id) {
            await db.query(
              `INSERT INTO agreement_notifications 
               (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
               VALUES (?, ?, 'agreement_completed', 'Agreement Completed', 'Agreement has been completed', NOW())`,
              [agreementId, owner_id]
            );
          }
        }
      }
    }

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'PAYMENT_VERIFIED', ?, ?, 'payment_submitted', NOW())`,
      [agreementId, `Payment verification: ${verification_status}`, admin_id]
    );

    res.json({ message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

// ============================================================================
// OWNER ENDPOINTS
// ============================================================================

// 8. Get Owner's Pending Agreements
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;

    const [agreements] = await db.query(
      `SELECT ar.*, p.title as property_title, p.location as property_location, 
              p.price as property_price, p.type as property_type,
              u_cust.name as customer_name, u_owner.name as owner_name
       FROM agreement_requests ar
       JOIN properties p ON ar.property_id = p.id
       JOIN users u_cust ON ar.customer_id = u_cust.id
       LEFT JOIN users u_owner ON ar.owner_id = u_owner.id
       WHERE ar.owner_id = ?
       ORDER BY ar.request_date DESC`,
      [ownerId]
    );

    res.json(agreements || []);
  } catch (error) {
    console.error('Error fetching owner agreements:', error);
    res.status(500).json({ message: 'Error fetching agreements', error: error.message });
  }
});

// 9. Owner Accept/Reject Agreement
router.post('/:agreementId/owner-response', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { response_status, response_message } = req.body;
    const owner_id = req.user?.id || req.body.owner_id;

    const newStatus = response_status === 'accepted' ? 'owner_approved' : 'owner_rejected';

    // Update agreement
    await db.query(
      "UPDATE agreement_requests SET status = ?, response_message = ?, owner_response_date = NOW(), updated_at = NOW() WHERE id = ?",
      [newStatus, response_message, agreementId]
    );

    // Get agreement details
    const [agreements] = await db.query(
      'SELECT customer_id, property_admin_id FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreements && agreements.length > 0) {
      const { customer_id, property_admin_id } = agreements[0];

      const notifType = response_status === 'accepted' ? 'owner_approved' : 'owner_rejected';
      const notifTitle = response_status === 'accepted' ? 'Owner Approved' : 'Owner Rejected';
      const notifMessage = response_status === 'accepted' ? 'Owner has approved the agreement' : 'Owner has rejected the agreement';

      // Notify customer
      if (customer_id) {
        await db.query(
          `INSERT INTO agreement_notifications 
           (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [agreementId, customer_id, notifType, notifTitle, notifMessage]
        );
      }

      // Notify admin
      if (property_admin_id) {
        await db.query(
          `INSERT INTO agreement_notifications 
           (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [agreementId, property_admin_id, notifType, notifTitle, notifMessage]
        );
      }
    }

    // Log audit
    await db.query(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'OWNER_RESPONSE', ?, ?, 'forwarded_to_owner', ?, NOW())`,
      [agreementId, `Owner ${response_status} agreement`, owner_id, newStatus]
    );

    res.json({ message: `Agreement ${response_status} successfully` });
  } catch (error) {
    console.error('Error processing owner response:', error);
    res.status(500).json({ message: 'Error processing response', error: error.message });
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateAgreementHTML(agreement) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Real Estate Agreement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .section-title { font-weight: bold; font-size: 14px; margin-top: 15px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px; border: 1px solid #ddd; }
        .signature-line { margin-top: 40px; border-top: 1px solid #000; width: 200px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>REAL ESTATE AGREEMENT</h1>
        <p>Agreement ID: ${agreement.id}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section">
        <div class="section-title">PROPERTY DETAILS</div>
        <table>
          <tr><td><strong>Property Title:</strong></td><td>${agreement.title || 'N/A'}</td></tr>
          <tr><td><strong>Location:</strong></td><td>${agreement.location || 'N/A'}</td></tr>
          <tr><td><strong>Type:</strong></td><td>${agreement.type || 'N/A'}</td></tr>
          <tr><td><strong>Price:</strong></td><td>${agreement.price || 0} ETB</td></tr>
          <tr><td><strong>Area:</strong></td><td>${agreement.area || 'N/A'} sq.m</td></tr>
          <tr><td><strong>Description:</strong></td><td>${agreement.description || 'N/A'}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">BUYER INFORMATION</div>
        <table>
          <tr><td><strong>Name:</strong></td><td>${agreement.customer_name || 'N/A'}</td></tr>
          <tr><td><strong>ID:</strong></td><td>${agreement.customer_id}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">SELLER INFORMATION</div>
        <table>
          <tr><td><strong>Name:</strong></td><td>${agreement.owner_name || 'N/A'}</td></tr>
          <tr><td><strong>ID:</strong></td><td>${agreement.owner_id}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">FINANCIAL TERMS</div>
        <table>
          <tr><td><strong>Agreement Amount:</strong></td><td>${agreement.price || 0} ETB</td></tr>
          <tr><td><strong>Commission (5% Customer):</strong></td><td>${((agreement.price || 0) * 0.05).toFixed(2)} ETB</td></tr>
          <tr><td><strong>Commission (5% Owner):</strong></td><td>${((agreement.price || 0) * 0.05).toFixed(2)} ETB</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">TERMS AND CONDITIONS</div>
        <p>This agreement is entered into between the buyer and seller for the purchase of the above-mentioned property. Both parties agree to the terms and conditions outlined in this document.</p>
      </div>

      <div class="section">
        <div class="section-title">SIGNATURES</div>
        <div style="margin-top: 40px;">
          <div style="display: inline-block; width: 45%;">
            <p><strong>Buyer Signature:</strong></p>
            <div class="signature-line"></div>
            <p>${agreement.customer_name || 'N/A'}</p>
          </div>
          <div style="display: inline-block; width: 45%; margin-left: 10%;">
            <p><strong>Seller Signature:</strong></p>
            <div class="signature-line"></div>
            <p>${agreement.owner_name || 'N/A'}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
