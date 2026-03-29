const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// STEP 1: CUSTOMER INITIATES REQUEST
// ============================================================================

// POST /api/agreement-workflow/request
// Customer clicks "Request Agreement"
router.post('/request', async (req, res) => {
  try {
    const { customer_id, property_id, customer_notes } = req.body;

    if (!customer_id || !property_id) {
      return res.status(400).json({ 
        message: 'Customer ID and Property ID required',
        success: false 
      });
    }

    // Get property details to find owner
    const [property] = await db.query(
      'SELECT owner_id, price FROM properties WHERE id = ?',
      [property_id]
    );

    if (property.length === 0) {
      return res.status(404).json({ 
        message: 'Property not found',
        success: false 
      });
    }

    const owner_id = property[0].owner_id;
    const property_price = property[0].price;

    // Check if property has an owner
    if (!owner_id) {
      return res.status(400).json({ 
        message: 'Property does not have an owner assigned',
        success: false 
      });
    }

    // Create agreement request
    const [result] = await db.query(`
      INSERT INTO agreement_requests (
        customer_id, owner_id, property_id, status, current_step,
        customer_notes, property_price
      ) VALUES (?, ?, ?, 'pending_admin_review', 1, ?, ?)
    `, [customer_id, owner_id, property_id, customer_notes, property_price]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 1, 'Customer Request', 'created', ?, NULL, 'pending_admin_review', ?)
    `, [result.insertId, customer_id, 'Customer initiated agreement request']);

    // Notify property admin
    const [admins] = await db.query(
      'SELECT id FROM users WHERE role = "property_admin" LIMIT 1'
    );

    if (admins.length > 0) {
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'request_received', 
          'New Agreement Request', 
          'Customer has requested an agreement for a property')
      `, [result.insertId, admins[0].id]);
    }

    res.json({
      success: true,
      message: 'Agreement request created successfully',
      agreement_id: result.insertId,
      status: 'pending_admin_review',
      current_step: 1
    });
  } catch (error) {
    console.error('Error creating agreement request:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 2: PROPERTY ADMIN REVIEWS & FORWARDS
// ============================================================================

// PUT /api/agreement-workflow/:agreementId/forward-to-owner
// Property admin forwards request to owner
router.put('/:agreementId/forward-to-owner', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, admin_notes } = req.body;

    // Get agreement details
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = 'waiting_owner_response',
        current_step = 2,
        property_admin_id = ?,
        forwarded_to_owner_date = NOW(),
        admin_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [admin_id, admin_notes, agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 2, 'Forward to Owner', 'forwarded', ?, 
        'pending_admin_review', 'waiting_owner_response', ?)
    `, [agreementId, admin_id, admin_notes]);

    // Notify owner
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'forwarded_to_owner', 
        'Agreement Request Forwarded', 
        'Property admin has forwarded an agreement request for your review')
    `, [agreementId, agreement[0].owner_id]);

    res.json({
      success: true,
      message: 'Agreement forwarded to owner',
      status: 'waiting_owner_response',
      current_step: 2
    });
  } catch (error) {
    console.error('Error forwarding agreement:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 3: OWNER DECISION
// ============================================================================

// PUT /api/agreement-workflow/:agreementId/owner-decision
// Owner accepts or rejects the request
router.put('/:agreementId/owner-decision', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { owner_id, decision, owner_notes } = req.body;

    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ 
        message: 'Invalid decision. Must be "accepted" or "rejected"',
        success: false 
      });
    }

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    const new_status = decision === 'accepted' ? 'owner_accepted' : 'owner_rejected';
    const next_step = decision === 'accepted' ? 3 : 3;

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = ?,
        current_step = ?,
        owner_decision = ?,
        owner_decision_date = NOW(),
        owner_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [new_status, next_step, decision, owner_notes, agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 3, 'Owner Decision', ?, ?, 
        'waiting_owner_response', ?, ?)
    `, [agreementId, decision, owner_id, new_status, owner_notes]);

    // Notify property admin
    const notification_title = decision === 'accepted' 
      ? 'Owner Accepted Agreement' 
      : 'Owner Rejected Agreement';
    const notification_message = decision === 'accepted'
      ? 'Owner has accepted the agreement request'
      : 'Owner has rejected the agreement request';

    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, ?, ?, ?)
    `, [agreementId, agreement[0].property_admin_id, decision, 
        notification_title, notification_message]);

    // If rejected, notify customer
    if (decision === 'rejected') {
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'owner_rejected', 
          'Agreement Request Rejected', 
          'Owner has rejected your agreement request')
      `, [agreementId, agreement[0].customer_id]);
    }

    res.json({
      success: true,
      message: `Agreement ${decision} by owner`,
      status: new_status,
      current_step: next_step
    });
  } catch (error) {
    console.error('Error processing owner decision:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 4: ADMIN GENERATES AGREEMENT
// ============================================================================

// POST /api/agreement-workflow/:agreementId/generate-agreement
// Admin generates agreement document
router.post('/:agreementId/generate-agreement', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, template_id } = req.body;

    // Get agreement details
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Get template
    const [template] = await db.query(
      'SELECT * FROM agreement_templates WHERE id = ?',
      [template_id || 1]
    );

    // Create agreement document
    const document_content = JSON.stringify({
      agreement_id: agreementId,
      customer_id: agreement[0].customer_id,
      owner_id: agreement[0].owner_id,
      property_id: agreement[0].property_id,
      property_price: agreement[0].property_price,
      template: template.length > 0 ? template[0].template_content : null,
      created_date: new Date().toISOString()
    });

    const [docResult] = await db.query(`
      INSERT INTO agreement_documents (
        agreement_request_id, version, document_type,
        document_content, generated_by_id
      ) VALUES (?, 1, 'initial', ?, ?)
    `, [agreementId, document_content, admin_id]);

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = 'agreement_generated',
        current_step = 4,
        agreement_generated_date = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status
      ) VALUES (?, 4, 'Generate Agreement', 'generated', ?, 
        'owner_accepted', 'agreement_generated')
    `, [agreementId, admin_id]);

    // Notify customer
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'agreement_generated', 
        'Agreement Generated', 
        'Your agreement document has been generated. Please review and complete it.')
    `, [agreementId, agreement[0].customer_id]);

    res.json({
      success: true,
      message: 'Agreement generated successfully',
      document_id: docResult.insertId,
      status: 'agreement_generated',
      current_step: 4
    });
  } catch (error) {
    console.error('Error generating agreement:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 5 & 6: CUSTOMER EDITS & SUBMITS AGREEMENT
// ============================================================================

// GET /api/agreement-workflow/:agreementId/fields
// Get all agreement fields
router.get('/:agreementId/fields', async (req, res) => {
  try {
    const { agreementId } = req.params;

    const [fields] = await db.query(
      'SELECT * FROM agreement_fields WHERE agreement_request_id = ? ORDER BY field_name',
      [agreementId]
    );

    res.json({
      success: true,
      fields
    });
  } catch (error) {
    console.error('Error fetching agreement fields:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// GET /api/agreement-workflow/:agreementId/auto-populate-fields
// Auto-populate agreement fields from profiles and documents
router.get('/:agreementId/auto-populate-fields', async (req, res) => {
  try {
    const { agreementId } = req.params;

    // Get agreement details
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    const agr = agreement[0];
    const fields = {};

    // Fetch customer profile and documents
    const [customerProfile] = await db.query(
      'SELECT * FROM customer_profiles WHERE user_id = ?',
      [agr.customer_id]
    );

    const [customerUser] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [agr.customer_id]
    );

    // Fetch owner profile and documents
    const [ownerProfile] = await db.query(
      'SELECT * FROM owner_profiles WHERE user_id = ?',
      [agr.owner_id]
    );

    const [ownerUser] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [agr.owner_id]
    );

    // Fetch property details
    const [property] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [agr.property_id]
    );

    // Fetch property documents
    const [propertyDocs] = await db.query(
      'SELECT * FROM property_documents WHERE property_id = ?',
      [agr.property_id]
    );

    // Fetch broker info if property has a broker
    let brokerInfo = null;
    if (property.length > 0 && property[0].broker_id) {
      const [broker] = await db.query(
        'SELECT b.*, bp.broker_license, bp.license_number FROM brokers b LEFT JOIN broker_profiles bp ON b.id = bp.user_id WHERE b.id = ?',
        [property[0].broker_id]
      );
      if (broker.length > 0) {
        brokerInfo = broker[0];
      }
    }

    // ============ CUSTOMER INFORMATION ============
    if (customerProfile.length > 0) {
      const cp = customerProfile[0];
      fields['customer_full_name'] = cp.full_name || customerUser[0].name;
      fields['customer_email'] = customerUser[0].email;
      fields['customer_phone'] = cp.phone_number || customerUser[0].phone;
      fields['customer_address'] = cp.address;
      fields['customer_id_document'] = cp.id_document ? 'Uploaded' : 'Not uploaded';
      fields['customer_profile_photo'] = cp.profile_photo ? 'Uploaded' : 'Not uploaded';
    } else {
      fields['customer_full_name'] = customerUser[0].name;
      fields['customer_email'] = customerUser[0].email;
      fields['customer_phone'] = customerUser[0].phone;
    }

    // ============ OWNER INFORMATION ============
    if (ownerProfile.length > 0) {
      const op = ownerProfile[0];
      fields['owner_full_name'] = op.full_name || ownerUser[0].name;
      fields['owner_email'] = ownerUser[0].email;
      fields['owner_phone'] = op.phone_number || ownerUser[0].phone;
      fields['owner_address'] = op.address;
      fields['owner_id_document'] = op.id_document ? 'Uploaded' : 'Not uploaded';
      fields['owner_business_license'] = op.business_license ? 'Uploaded' : 'Not uploaded';
      fields['owner_profile_photo'] = op.profile_photo ? 'Uploaded' : 'Not uploaded';
    } else {
      fields['owner_full_name'] = ownerUser[0].name;
      fields['owner_email'] = ownerUser[0].email;
      fields['owner_phone'] = ownerUser[0].phone;
    }

    // ============ PROPERTY INFORMATION ============
    if (property.length > 0) {
      const prop = property[0];
      fields['property_title'] = prop.title;
      fields['property_type'] = prop.type;
      fields['property_location'] = prop.location;
      fields['property_price'] = prop.price.toString();
      fields['property_bedrooms'] = prop.bedrooms ? prop.bedrooms.toString() : 'N/A';
      fields['property_bathrooms'] = prop.bathrooms ? prop.bathrooms.toString() : 'N/A';
      fields['property_area'] = prop.area ? prop.area.toString() : 'N/A';
      fields['property_description'] = prop.description;
    }

    // ============ PROPERTY DOCUMENTS ============
    if (propertyDocs.length > 0) {
      fields['property_documents_count'] = propertyDocs.length.toString();
      fields['property_documents_list'] = propertyDocs.map(d => d.document_name).join(', ');
    } else {
      fields['property_documents_count'] = '0';
      fields['property_documents_list'] = 'No documents uploaded';
    }

    // ============ BROKER INFORMATION (if applicable) ============
    if (brokerInfo) {
      fields['broker_name'] = brokerInfo.name;
      fields['broker_email'] = brokerInfo.email;
      fields['broker_phone'] = brokerInfo.phone;
      fields['broker_license_number'] = brokerInfo.license_number || 'N/A';
      fields['broker_license_document'] = brokerInfo.broker_license ? 'Uploaded' : 'Not uploaded';
      fields['broker_commission_rate'] = brokerInfo.commission_rate ? brokerInfo.commission_rate.toString() + '%' : 'N/A';
    }

    // ============ AGREEMENT DETAILS ============
    fields['agreement_property_price'] = agr.property_price.toString();
    fields['agreement_commission_percentage'] = agr.commission_percentage ? agr.commission_percentage.toString() + '%' : '5%';
    fields['agreement_date'] = new Date().toISOString().split('T')[0];

    // Store all fields in database
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      await db.query(`
        INSERT INTO agreement_fields (
          agreement_request_id, field_name, field_value, is_editable
        ) VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          field_value = VALUES(field_value)
      `, [agreementId, fieldName, fieldValue, fieldName.startsWith('agreement_') ? false : true]);
    }

    res.json({
      success: true,
      message: 'Agreement fields auto-populated successfully',
      fields
    });
  } catch (error) {
    console.error('Error auto-populating agreement fields:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// PUT /api/agreement-workflow/:agreementId/update-fields
// Customer edits agreement fields
router.put('/:agreementId/update-fields', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { customer_id, fields } = req.body;

    if (!fields || typeof fields !== 'object') {
      return res.status(400).json({ 
        message: 'Fields object required',
        success: false 
      });
    }

    // Update each field (only editable fields)
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      await db.query(`
        INSERT INTO agreement_fields (
          agreement_request_id, field_name, field_value, edited_by_id, is_editable
        ) VALUES (?, ?, ?, ?, true)
        ON DUPLICATE KEY UPDATE
          field_value = VALUES(field_value),
          edited_by_id = VALUES(edited_by_id),
          edited_date = NOW()
      `, [agreementId, fieldName, fieldValue, customer_id]);
    }

    res.json({
      success: true,
      message: 'Agreement fields updated successfully'
    });
  } catch (error) {
    console.error('Error updating agreement fields:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// POST /api/agreement-workflow/:agreementId/submit-agreement
// Customer submits completed agreement with payment
router.post('/:agreementId/submit-agreement', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { customer_id, payment_method, payment_amount, receipt_file_path } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Record payment
    const [paymentResult] = await db.query(`
      INSERT INTO agreement_payments (
        agreement_request_id, payment_method, payment_amount,
        receipt_file_path, payment_date
      ) VALUES (?, ?, ?, ?, NOW())
    `, [agreementId, payment_method, payment_amount, receipt_file_path]);

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = 'customer_submitted',
        current_step = 6,
        customer_submitted_date = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status
      ) VALUES (?, 6, 'Customer Submission', 'submitted', ?, 
        'customer_editing', 'customer_submitted')
    `, [agreementId, customer_id]);

    // Notify admin
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'customer_submitted', 
        'Agreement Submitted by Customer', 
        'Customer has submitted the completed agreement with payment')
    `, [agreementId, agreement[0].property_admin_id]);

    res.json({
      success: true,
      message: 'Agreement submitted successfully',
      payment_id: paymentResult.insertId,
      status: 'customer_submitted',
      current_step: 6
    });
  } catch (error) {
    console.error('Error submitting agreement:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 7: ADMIN REVIEWS SUBMISSION
// ============================================================================

// PUT /api/agreement-workflow/:agreementId/admin-review
// Admin reviews customer submission
router.put('/:agreementId/admin-review', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, action, admin_notes } = req.body;

    if (!['approved', 'rejected', 'suspended'].includes(action)) {
      return res.status(400).json({ 
        message: 'Invalid action. Must be approved, rejected, or suspended',
        success: false 
      });
    }

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    const new_status = action === 'approved' ? 'waiting_owner_final_review' : action;
    const next_step = action === 'approved' ? 8 : 7;

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = ?,
        current_step = ?,
        admin_action = ?,
        admin_action_date = NOW(),
        admin_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [new_status, next_step, action, admin_notes, agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 7, 'Admin Review', ?, ?, 
        'customer_submitted', ?, ?)
    `, [agreementId, action, admin_id, new_status, admin_notes]);

    // Notify based on action
    if (action === 'approved') {
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'admin_approved', 
          'Agreement Approved by Admin', 
          'Admin has approved your agreement. Awaiting owner final review.')
      `, [agreementId, agreement[0].owner_id]);
    } else if (action === 'rejected') {
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'admin_rejected', 
          'Agreement Rejected', 
          'Admin has rejected the agreement. Please contact for details.')
      `, [agreementId, agreement[0].customer_id]);
    }

    res.json({
      success: true,
      message: `Agreement ${action} by admin`,
      status: new_status,
      current_step: next_step
    });
  } catch (error) {
    console.error('Error reviewing agreement:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 8 & 9: OWNER FINAL REVIEW & SUBMISSION
// ============================================================================

// POST /api/agreement-workflow/:agreementId/owner-final-review
// Owner reviews and submits final agreement
router.post('/:agreementId/owner-final-review', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { owner_id, owner_notes } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Update agreement
    await db.query(`
      UPDATE agreement_requests SET
        status = 'owner_submitted',
        current_step = 9,
        owner_final_submitted_date = NOW(),
        owner_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [owner_notes, agreementId]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 9, 'Owner Final Submission', 'submitted', ?, 
        'waiting_owner_final_review', 'owner_submitted', ?)
    `, [agreementId, owner_id, owner_notes]);

    // Notify admin for commission calculation
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'owner_submitted', 
        'Owner Submitted Final Agreement', 
        'Owner has submitted the final agreement. Ready for commission calculation.')
    `, [agreementId, agreement[0].property_admin_id]);

    res.json({
      success: true,
      message: 'Owner final review submitted',
      status: 'owner_submitted',
      current_step: 9
    });
  } catch (error) {
    console.error('Error submitting owner final review:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// STEP 10: COMMISSION CALCULATION & FINAL HANDSHAKE
// ============================================================================

// POST /api/agreement-workflow/:agreementId/calculate-commission
// Admin calculates commission
router.post('/:agreementId/calculate-commission', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { admin_id, commission_percentage } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    const property_price = agreement[0].property_price;
    const commission_pct = commission_percentage || 5.00;
    
    // Calculate commissions (5% from customer, 5% from owner)
    const customer_commission = (property_price * commission_pct) / 100;
    const owner_commission = (property_price * commission_pct) / 100;
    const total_commission = customer_commission + owner_commission;

    // Update agreement with commission
    await db.query(`
      UPDATE agreement_requests SET
        commission_percentage = ?,
        customer_commission = ?,
        owner_commission = ?,
        total_commission = ?,
        commission_calculated_date = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [commission_pct, customer_commission, owner_commission, total_commission, agreementId]);

    // Create commission records
    await db.query(`
      INSERT INTO agreement_commissions (
        agreement_request_id, commission_type, recipient_id,
        property_price, commission_percentage, commission_amount,
        calculated_by_id
      ) VALUES (?, 'customer', ?, ?, ?, ?, ?)
    `, [agreementId, agreement[0].customer_id, property_price, commission_pct, customer_commission, admin_id]);

    await db.query(`
      INSERT INTO agreement_commissions (
        agreement_request_id, commission_type, recipient_id,
        property_price, commission_percentage, commission_amount,
        calculated_by_id
      ) VALUES (?, 'owner', ?, ?, ?, ?, ?)
    `, [agreementId, agreement[0].owner_id, property_price, commission_pct, owner_commission, admin_id]);

    // Log workflow history
    await db.query(`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status
      ) VALUES (?, 10, 'Commission Calculation', 'calculated', ?, 
        'owner_submitted', 'ready_for_handshake')
    `, [agreementId, admin_id]);

    // Notify both parties
    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'commission_calculated', 
        'Commission Calculated', 
        'Commission has been calculated. Ready for final handshake.')
    `, [agreementId, agreement[0].customer_id]);

    await db.query(`
      INSERT INTO agreement_notifications (
        agreement_request_id, recipient_id, notification_type,
        notification_title, notification_message
      ) VALUES (?, ?, 'commission_calculated', 
        'Commission Calculated', 
        'Commission has been calculated. Ready for final handshake.')
    `, [agreementId, agreement[0].owner_id]);

    res.json({
      success: true,
      message: 'Commission calculated successfully',
      customer_commission,
      owner_commission,
      total_commission,
      status: 'ready_for_handshake'
    });
  } catch (error) {
    console.error('Error calculating commission:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// POST /api/agreement-workflow/:agreementId/final-handshake
// Both parties agree to finalize transaction
router.post('/:agreementId/final-handshake', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { user_id, user_role } = req.body;

    // Get agreement
    const [agreement] = await db.query(
      'SELECT * FROM agreement_requests WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Record handshake signature
    await db.query(`
      INSERT INTO agreement_signatures (
        agreement_request_id, signer_id, signer_role
      ) VALUES (?, ?, ?)
    `, [agreementId, user_id, user_role]);

    // Check if both parties have signed
    const [signatures] = await db.query(
      'SELECT COUNT(DISTINCT signer_role) as count FROM agreement_signatures WHERE agreement_request_id = ?',
      [agreementId]
    );

    const both_signed = signatures[0].count >= 2;

    if (both_signed) {
      // Create final transaction
      const [transactionResult] = await db.query(`
        INSERT INTO agreement_transactions (
          agreement_request_id, transaction_type, transaction_status,
          buyer_id, seller_id, property_id, transaction_amount,
          commission_amount, net_amount
        ) VALUES (?, 'sale', 'completed', ?, ?, ?, ?, ?, ?)
      `, [
        agreementId,
        agreement[0].customer_id,
        agreement[0].owner_id,
        agreement[0].property_id,
        agreement[0].property_price,
        agreement[0].total_commission,
        agreement[0].property_price - agreement[0].total_commission
      ]);

      // Update agreement to completed
      await db.query(`
        UPDATE agreement_requests SET
          status = 'completed',
          current_step = 10,
          completed_date = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `, [agreementId]);

      // Log workflow history
      await db.query(`
        INSERT INTO agreement_workflow_history (
          agreement_request_id, step_number, step_name, action,
          action_by_id, previous_status, new_status
        ) VALUES (?, 10, 'Final Handshake', 'completed', ?, 
          'ready_for_handshake', 'completed')
      `, [agreementId, user_id]);

      // Notify both parties
      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'transaction_completed', 
          '🎉 Transaction Completed', 
          'Congratulations! You have successfully completed the property transaction.')
      `, [agreementId, agreement[0].customer_id]);

      await db.query(`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'transaction_completed', 
          '✅ Property Sold', 
          'Your property has been successfully sold. Commission has been calculated.')
      `, [agreementId, agreement[0].owner_id]);

      return res.json({
        success: true,
        message: 'Transaction completed successfully',
        transaction_id: transactionResult.insertId,
        status: 'completed',
        current_step: 10
      });
    }

    res.json({
      success: true,
      message: 'Handshake recorded. Awaiting other party signature.',
      status: 'ready_for_handshake',
      signatures_count: signatures[0].count
    });
  } catch (error) {
    console.error('Error processing final handshake:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// ============================================================================
// GET ENDPOINTS FOR DASHBOARD VIEWS
// ============================================================================

// GET /api/agreement-workflow/:agreementId
// Get agreement details
router.get('/:agreementId', async (req, res) => {
  try {
    const { agreementId } = req.params;

    const [agreement] = await db.query(
      'SELECT * FROM v_agreement_status WHERE id = ?',
      [agreementId]
    );

    if (agreement.length === 0) {
      return res.status(404).json({ 
        message: 'Agreement not found',
        success: false 
      });
    }

    // Get documents
    const [documents] = await db.query(
      'SELECT * FROM agreement_documents WHERE agreement_request_id = ? ORDER BY version DESC',
      [agreementId]
    );

    // Get payments
    const [payments] = await db.query(
      'SELECT * FROM agreement_payments WHERE agreement_request_id = ?',
      [agreementId]
    );

    // Get commissions
    const [commissions] = await db.query(
      'SELECT * FROM agreement_commissions WHERE agreement_request_id = ?',
      [agreementId]
    );

    // Get workflow history
    const [history] = await db.query(
      'SELECT * FROM agreement_workflow_history WHERE agreement_request_id = ? ORDER BY action_date DESC',
      [agreementId]
    );

    res.json({
      success: true,
      agreement: agreement[0],
      documents,
      payments,
      commissions,
      history
    });
  } catch (error) {
    console.error('Error fetching agreement:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// GET /api/agreement-workflow/user/:userId
// Get all agreements for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [agreements] = await db.query(`
      SELECT * FROM v_agreement_status 
      WHERE customer_id = ? OR owner_id = ?
      ORDER BY created_at DESC
    `, [userId, userId]);

    res.json({
      success: true,
      agreements,
      count: agreements.length
    });
  } catch (error) {
    console.error('Error fetching user agreements:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

// GET /api/agreement-workflow/admin/pending
// Get pending agreements for admin
router.get('/admin/pending', async (req, res) => {
  try {
    const [agreements] = await db.query(`
      SELECT * FROM v_agreement_status 
      WHERE status IN ('pending_admin_review', 'customer_submitted', 'owner_submitted')
      ORDER BY created_at ASC
    `);

    res.json({
      success: true,
      agreements,
      count: agreements.length
    });
  } catch (error) {
    console.error('Error fetching pending agreements:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      success: false 
    });
  }
});

module.exports = router;
