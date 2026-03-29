const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

    const conn = await pool.getConnection();

    // Get property details
    const [property] = await conn.execute(
      'SELECT * FROM properties WHERE id = ?',
      [property_id]
    );

    if (!property || property.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Property not found' });
    }

    const prop = property[0];

    // Get property admin (static single admin)
    const [admins] = await conn.execute(
      'SELECT id FROM users WHERE role = "property_admin" LIMIT 1'
    );

    if (!admins || admins.length === 0) {
      conn.release();
      return res.status(400).json({ message: 'No property admin available' });
    }

    const property_admin_id = admins[0].id;
    
    // Determine owner_id - use property owner or broker, fallback to property_admin
    const owner_id = prop.owner_id || prop.broker_id || property_admin_id;

    // Create agreement request
    const [result] = await conn.execute(
      `INSERT INTO agreement_requests 
       (property_id, customer_id, owner_id, property_admin_id, customer_notes, status, request_date)
       VALUES (?, ?, ?, ?, ?, 'pending_admin_review', NOW())`,
      [property_id, customer_id, owner_id, property_admin_id, customer_notes]
    );

    // Create notification for admin
    await conn.execute(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'request_received', 'New Agreement Request', ?, NOW())`,
      [result.insertId, property_admin_id, `New agreement request for property: ${prop.title}`]
    );

    // Log audit
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'REQUEST_CREATED', 'Customer requested agreement', ?, 'pending_admin_review', NOW())`,
      [result.insertId, customer_id]
    );

    conn.release();

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

    const conn = await pool.getConnection();

    const [agreements] = await conn.execute(
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

    conn.release();

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

    const conn = await pool.getConnection();

    // Create payment receipt
    const [result] = await conn.execute(
      `INSERT INTO payment_receipts 
       (agreement_request_id, payment_method, payment_amount, receipt_file_path, verification_status, created_at)
       VALUES (?, ?, ?, ?, 'pending', NOW())`,
      [agreementId, payment_method, payment_amount, receipt_file_path]
    );

    // Update agreement status
    await conn.execute(
      `UPDATE agreement_requests SET status = 'payment_submitted', updated_at = NOW() WHERE id = ?`,
      [agreementId]
    );

    // Create notification
    const [agreement] = await conn.execute(
      'SELECT property_admin_id FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement && agreement.length > 0) {
      await conn.execute(
        `INSERT INTO agreement_notifications 
         (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
         VALUES (?, ?, 'payment_submitted', 'Payment Submitted', 'Customer submitted payment for agreement', NOW())`,
        [agreementId, agreement[0].property_admin_id]
      );
    }

    // Log audit
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'PAYMENT_SUBMITTED', 'Customer submitted payment', ?, 'payment_submitted', NOW())`,
      [agreementId, customer_id]
    );

    conn.release();

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

    const conn = await pool.getConnection();

    const [agreements] = await conn.execute(
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

    conn.release();

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

    const conn = await pool.getConnection();

    // Get agreement details
    const [agreements] = await conn.execute(
      `SELECT ar.*, p.*, u_cust.name as customer_name, u_owner.name as owner_name
       FROM agreement_requests ar
       JOIN properties p ON ar.property_id = p.id
       JOIN users u_cust ON ar.customer_id = u_cust.id
       LEFT JOIN users u_owner ON ar.owner_id = u_owner.id
       WHERE ar.id = ?`,
      [agreementId]
    );

    if (!agreements || agreements.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const agreement = agreements[0];

    // Generate HTML document
    const documentHTML = generateAgreementHTML(agreement);

    // Store document
    const [result] = await conn.execute(
      `INSERT INTO agreement_documents 
       (agreement_request_id, version, document_type, document_html, generated_by_id, generated_date)
       VALUES (?, 1, 'initial', ?, ?, NOW())`,
      [agreementId, documentHTML, admin_id]
    );

    // Update agreement status
    await conn.execute(
      `UPDATE agreement_requests SET status = 'forwarded_to_owner', forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?`,
      [agreementId]
    );

    // Create notification for owner
    await conn.execute(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'agreement_forwarded', 'Agreement Forwarded', 'Agreement has been forwarded for your review', NOW())`,
      [agreementId, agreement.owner_id]
    );

    // Log audit
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'AGREEMENT_GENERATED', 'Admin generated agreement document', ?, 'pending_admin_review', 'forwarded_to_owner', NOW())`,
      [agreementId, admin_id]
    );

    conn.release();

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

    const conn = await pool.getConnection();

    // Get agreement
    const [agreements] = await conn.execute(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (!agreements || agreements.length === 0) {
      conn.release();
      return res.status(404).json({ message: 'Agreement not found' });
    }

    const agreement = agreements[0];

    // Update status
    await conn.execute(
      `UPDATE agreement_requests SET status = 'forwarded_to_owner', forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?`,
      [agreementId]
    );

    // Create notification
    await conn.execute(
      `INSERT INTO agreement_notifications 
       (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
       VALUES (?, ?, 'agreement_forwarded', 'Agreement Forwarded', 'Agreement forwarded for your review', NOW())`,
      [agreementId, agreement.owner_id]
    );

    // Log audit
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'FORWARDED_TO_OWNER', 'Admin forwarded agreement to owner', ?, 'pending_admin_review', 'forwarded_to_owner', NOW())`,
      [agreementId, admin_id]
    );

    conn.release();

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

    const conn = await pool.getConnection();

    // Update payment receipt
    await conn.execute(
      `UPDATE payment_receipts SET verification_status = ?, verification_notes = ?, verified_by_id = ?, verification_date = NOW()
       WHERE agreement_request_id = ?`,
      [verification_status, verification_notes, admin_id, agreementId]
    );

    // If verified, calculate commission
    if (verification_status === 'verified') {
      const [agreements] = await conn.execute(
        'SELECT * FROM agreement_requests WHERE id = ?',
        [agreementId]
      );

      if (agreements && agreements.length > 0) {
        const agreement = agreements[0];
        const [properties] = await conn.execute(
          'SELECT price FROM properties WHERE id = ?',
          [agreement.property_id]
        );

        if (properties && properties.length > 0) {
          const price = properties[0].price;
          const customer_commission = (price * 5) / 100;
          const owner_commission = (price * 5) / 100;
          const total_commission = customer_commission + owner_commission;

          // Store commission
          await conn.execute(
            `INSERT INTO commission_tracking 
             (agreement_request_id, agreement_amount, customer_commission_percentage, owner_commission_percentage, 
              customer_commission, owner_commission, total_commission, calculated_at)
             VALUES (?, ?, 5, 5, ?, ?, ?, NOW())`,
            [agreementId, price, customer_commission, owner_commission, total_commission]
          );

          // Update agreement status
          await conn.execute(
            `UPDATE agreement_requests SET status = 'completed', completion_date = NOW(), updated_at = NOW() WHERE id = ?`,
            [agreementId]
          );

          // Create notifications
          const [agreement_data] = await conn.execute(
            'SELECT customer_id, owner_id FROM agreement_requests WHERE id = ?',
            [agreementId]
          );

          if (agreement_data && agreement_data.length > 0) {
            const { customer_id, owner_id } = agreement_data[0];

            await conn.execute(
              `INSERT INTO agreement_notifications 
               (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
               VALUES (?, ?, 'payment_verified', 'Payment Verified', 'Your payment has been verified', NOW())`,
              [agreementId, customer_id]
            );

            await conn.execute(
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
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, new_status, created_at)
       VALUES (?, 'PAYMENT_VERIFIED', ?, ?, 'payment_submitted', NOW())`,
      [agreementId, `Payment verification: ${verification_status}`, admin_id]
    );

    conn.release();

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

    const conn = await pool.getConnection();

    const [agreements] = await conn.execute(
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

    conn.release();

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

    const conn = await pool.getConnection();

    const newStatus = response_status === 'accepted' ? 'owner_approved' : 'owner_rejected';

    // Update agreement
    await conn.execute(
      `UPDATE agreement_requests SET status = ?, response_message = ?, owner_response_date = NOW(), updated_at = NOW() WHERE id = ?`,
      [newStatus, response_message, agreementId]
    );

    // Get agreement details
    const [agreements] = await conn.execute(
      'SELECT customer_id, property_admin_id FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreements && agreements.length > 0) {
      const { customer_id, property_admin_id } = agreements[0];

      // Create notifications
      await conn.execute(
        `INSERT INTO agreement_notifications 
         (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [agreementId, customer_id, 
         response_status === 'accepted' ? 'owner_approved' : 'owner_rejected',
         response_status === 'accepted' ? 'Owner Approved' : 'Owner Rejected',
         response_status === 'accepted' ? 'Owner has approved the agreement' : 'Owner has rejected the agreement']
      );

      await conn.execute(
        `INSERT INTO agreement_notifications 
         (agreement_request_id, recipient_id, notification_type, notification_title, notification_message, sent_date)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [agreementId, property_admin_id,
         response_status === 'accepted' ? 'owner_approved' : 'owner_rejected',
         response_status === 'accepted' ? 'Owner Approved' : 'Owner Rejected',
         response_status === 'accepted' ? 'Owner has approved the agreement' : 'Owner has rejected the agreement']
      );
    }

    // Log audit
    await conn.execute(
      `INSERT INTO agreement_audit_log 
       (agreement_request_id, action_type, action_description, performed_by_id, old_status, new_status, created_at)
       VALUES (?, 'OWNER_RESPONSE', ?, ?, 'forwarded_to_owner', ?, NOW())`,
      [agreementId, `Owner ${response_status} agreement`, owner_id, newStatus]
    );

    conn.release();

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
          <tr><td><strong>Property Title:</strong></td><td>${agreement.title}</td></tr>
          <tr><td><strong>Location:</strong></td><td>${agreement.location}</td></tr>
          <tr><td><strong>Type:</strong></td><td>${agreement.type}</td></tr>
          <tr><td><strong>Price:</strong></td><td>${agreement.price} ETB</td></tr>
          <tr><td><strong>Area:</strong></td><td>${agreement.area} sq.m</td></tr>
          <tr><td><strong>Description:</strong></td><td>${agreement.description}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">BUYER INFORMATION</div>
        <table>
          <tr><td><strong>Name:</strong></td><td>${agreement.customer_name}</td></tr>
          <tr><td><strong>ID:</strong></td><td>${agreement.customer_id}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">SELLER INFORMATION</div>
        <table>
          <tr><td><strong>Name:</strong></td><td>${agreement.owner_name}</td></tr>
          <tr><td><strong>ID:</strong></td><td>${agreement.owner_id}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">FINANCIAL TERMS</div>
        <table>
          <tr><td><strong>Agreement Amount:</strong></td><td>${agreement.price} ETB</td></tr>
          <tr><td><strong>Commission (5% Customer):</strong></td><td>${(agreement.price * 0.05).toFixed(2)} ETB</td></tr>
          <tr><td><strong>Commission (5% Owner):</strong></td><td>${(agreement.price * 0.05).toFixed(2)} ETB</td></tr>
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
            <p>${agreement.customer_name}</p>
          </div>
          <div style="display: inline-block; width: 45%; margin-left: 10%;">
            <p><strong>Seller Signature:</strong></p>
            <div class="signature-line"></div>
            <p>${agreement.owner_name}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;
