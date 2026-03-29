const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper: Generate agreement HTML document
function generateAgreementHTML(agreement, property, owner, customer, ownerDocs, customerDocs) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Property Agreement - DDREMS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px double #16213e; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; color: #16213e; margin-bottom: 5px; letter-spacing: 2px; }
    .header h2 { font-size: 18px; color: #0f3460; font-weight: normal; }
    .header .subtitle { font-size: 13px; color: #6b7280; margin-top: 8px; }
    .agreement-id { text-align: right; color: #6b7280; font-size: 12px; margin-bottom: 20px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 16px; font-weight: bold; color: #16213e; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-item { padding: 8px 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .info-item label { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-item span { font-size: 14px; font-weight: 600; color: #1e293b; }
    .party-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 12px; background: #fafbfc; }
    .party-box h4 { color: #0f3460; margin-bottom: 8px; font-size: 14px; }
    .party-box p { font-size: 13px; color: #374151; line-height: 1.6; }
    .documents-list { list-style: none; padding: 0; }
    .documents-list li { padding: 8px 12px; background: #f1f5f9; margin-bottom: 6px; border-radius: 6px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
    .documents-list li::before { content: '📄'; }
    .fillable-field { border: none; border-bottom: 2px dotted #94a3b8; padding: 6px 4px; font-size: 14px; font-family: inherit; width: 100%; background: #fffbeb; margin: 4px 0; min-height: 30px; }
    .fillable-field:focus { outline: none; border-bottom-color: #3b82f6; background: #eff6ff; }
    .fillable-area { border: 1px dashed #94a3b8; padding: 12px; font-size: 14px; font-family: inherit; width: 100%; background: #fffbeb; margin: 4px 0; min-height: 80px; border-radius: 6px; resize: vertical; }
    .terms-text { padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.8; font-size: 14px; white-space: pre-wrap; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; }
    .signature-box { text-align: center; }
    .signature-box h4 { font-size: 14px; color: #16213e; margin-bottom: 10px; }
    .signature-line { border: 2px solid #d1d5db; border-radius: 8px; height: 100px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-style: italic; font-size: 13px; background: #fefefe; }
    .signature-line img { max-height: 90px; max-width: 90%; }
    .signature-name { font-size: 13px; color: #374151; border-top: 1px solid #374151; padding-top: 4px; margin-top: 8px; }
    .signature-date { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>DDREMS</h1>
    <h2>Property Agreement</h2>
    <p class="subtitle">Dire Dawa Real Estate Management System</p>
  </div>

  <div class="agreement-id">
    Agreement #${agreement.id} | Date: ${today}
  </div>

  <div class="section">
    <h3 class="section-title">📋 Property Information</h3>
    <div class="info-grid">
      <div class="info-item"><label>Property Title</label><span>${property.title || 'N/A'}</span></div>
      <div class="info-item"><label>Location</label><span>${property.location || 'N/A'}</span></div>
      <div class="info-item"><label>Type</label><span>${(property.type || 'N/A').charAt(0).toUpperCase() + (property.type || '').slice(1)}</span></div>
      <div class="info-item"><label>Price</label><span>${Number(property.price || 0).toLocaleString()} ETB</span></div>
      <div class="info-item"><label>Area</label><span>${property.area ? property.area + ' sqm' : 'N/A'}</span></div>
      <div class="info-item"><label>Status</label><span>${(property.status || 'N/A').charAt(0).toUpperCase() + (property.status || '').slice(1)}</span></div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">👥 Parties Involved</h3>
    <div class="info-grid">
      <div class="party-box">
        <h4>🏠 Property Owner</h4>
        <p><strong>Name:</strong> ${owner.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${owner.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${owner.phone || 'N/A'}</p>
      </div>
      <div class="party-box">
        <h4>🙋 Customer / Buyer</h4>
        <p><strong>Name:</strong> ${customer.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">📁 Documents Provided</h3>
    <div class="info-grid">
      <div>
        <h4 style="font-size:13px;color:#374151;margin-bottom:8px;">Owner Documents</h4>
        <ul class="documents-list">
          ${ownerDocs.length > 0 
            ? ownerDocs.map(d => `<li>${d.document_name} (${d.document_type})</li>`).join('')
            : '<li style="color:#9ca3af;">No documents uploaded</li>'}
        </ul>
      </div>
      <div>
        <h4 style="font-size:13px;color:#374151;margin-bottom:8px;">Customer Documents</h4>
        <ul class="documents-list">
          ${customerDocs.length > 0 
            ? customerDocs.map(d => `<li>${d.document_name} (${d.document_type})</li>`).join('')
            : '<li style="color:#9ca3af;">No documents uploaded</li>'}
        </ul>
      </div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">📝 Agreement Terms</h3>
    <div class="terms-text">${agreement.agreement_text || agreement.terms || 'Terms to be specified.'}</div>
  </div>

  <div class="section">
    <h3 class="section-title">✏️ Fields to be Completed</h3>
    <div class="info-grid">
      <div class="info-item">
        <label>Agreement Duration</label>
        <div class="fillable-field" data-field="duration">${agreement.duration || ''}</div>
      </div>
      <div class="info-item">
        <label>Payment Terms</label>
        <div class="fillable-field" data-field="payment_terms">${agreement.payment_terms || ''}</div>
      </div>
    </div>
    <div style="margin-top:12px;">
      <div class="info-item">
        <label>Special Conditions</label>
        <div class="fillable-area" data-field="special_conditions">${agreement.special_conditions || ''}</div>
      </div>
    </div>
    <div style="margin-top:12px;">
      <div class="info-item">
        <label>Additional Terms</label>
        <div class="fillable-area" data-field="additional_terms">${agreement.additional_terms || ''}</div>
      </div>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <h4>Owner Signature</h4>
      <div class="signature-line">
        ${agreement.owner_signature 
          ? `<img src="${agreement.owner_signature}" alt="Owner Signature" />`
          : 'Sign here'}
      </div>
      <div class="signature-name">${owner.name || '________________'}</div>
      <div class="signature-date">${agreement.owner_signed_at ? new Date(agreement.owner_signed_at).toLocaleDateString() : 'Date: ___________'}</div>
    </div>
    <div class="signature-box">
      <h4>Customer Signature</h4>
      <div class="signature-line">
        ${agreement.customer_signature 
          ? `<img src="${agreement.customer_signature}" alt="Customer Signature" />`
          : 'Sign here'}
      </div>
      <div class="signature-name">${customer.name || '________________'}</div>
      <div class="signature-date">${agreement.customer_signed_at ? new Date(agreement.customer_signed_at).toLocaleDateString() : 'Date: ___________'}</div>
    </div>
  </div>

  <div class="footer">
    <p>This agreement is generated by the Dire Dawa Real Estate Management System (DDREMS)</p>
    <p>Agreement ID: #${agreement.id} | Generated: ${today}</p>
  </div>
</body>
</html>`;
}

// Get single agreement with full details
router.get('/:id', async (req, res) => {
  try {
    const [agreements] = await db.query(`
      SELECT a.*, p.title as property_title, p.location as property_location, 
             p.price as property_price, p.type as property_type, p.area as property_area, p.status as property_status,
             owner.name as owner_name, owner.email as owner_email, owner.phone as owner_phone,
             cust.name as customer_name, cust.email as customer_email, cust.phone as customer_phone
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN users owner ON a.owner_id = owner.id
      LEFT JOIN users cust ON a.customer_id = cust.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    res.json({ agreement: agreements[0], success: true });
  } catch (error) {
    console.error('Get agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get owner agreements
router.get('/owner/:userId', async (req, res) => {
  try {
    const [agreements] = await db.query(`
      SELECT a.*, p.title as property_title, p.location as property_location, p.price as property_price,
             cust.name as customer_name, cust.email as customer_email
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN users cust ON a.customer_id = cust.id
      WHERE a.owner_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.userId]);
    res.json(agreements);
  } catch (error) {
    console.error('Get owner agreements error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker agreements
router.get('/broker/:userId', async (req, res) => {
  try {
    const [agreements] = await db.query(`
      SELECT a.*, p.title as property_title, p.location as property_location, p.price as property_price,
             cust.name as customer_name, cust.email as customer_email
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN users cust ON a.customer_id = cust.id
      WHERE a.broker_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.userId]);
    res.json(agreements);
  } catch (error) {
    console.error('Get broker agreements error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer agreements
router.get('/customer/:userId', async (req, res) => {
  try {
    const [agreements] = await db.query(`
      SELECT a.*, p.title as property_title, p.location as property_location, p.price as property_price,
             owner.name as owner_name, owner.email as owner_email
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      LEFT JOIN users owner ON a.owner_id = owner.id
      WHERE a.customer_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.userId]);
    res.json(agreements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create agreement
router.post('/', async (req, res) => {
  try {
    const { property_id, owner_id, customer_id, broker_id, agreement_text, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO agreements (property_id, owner_id, customer_id, broker_id, agreement_text, status) VALUES (?, ?, ?, ?, ?, ?)',
      [property_id, owner_id, customer_id, broker_id || null, agreement_text, status || 'pending']
    );
    res.status(201).json({ id: result.insertId, message: 'Agreement created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate agreement document
router.post('/:id/generate-document', async (req, res) => {
  try {
    const agreementId = req.params.id;

    // Get agreement with full details
    const [agreements] = await db.query(`
      SELECT a.*, p.title, p.location, p.price, p.type, p.area, p.status as property_status,
             p.id as prop_id
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ?
    `, [agreementId]);

    if (agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    const agreement = agreements[0];
    const customerId = agreement.customer_id;

    // Get owner and customer info
    const [owners] = await db.query('SELECT name, email, phone FROM users WHERE id = ?', [agreement.owner_id]);
    const [customers] = await db.query('SELECT name, email, phone FROM users WHERE id = ?', [customerId]);

    const owner = owners.length > 0 ? owners[0] : { name: 'N/A', email: 'N/A', phone: 'N/A' };
    const customer = customers.length > 0 ? customers[0] : { name: 'N/A', email: 'N/A', phone: 'N/A' };

    // Get property documents (owner side)
    const [ownerDocs] = await db.query(
      'SELECT document_name, document_type FROM property_documents WHERE property_id = ?',
      [agreement.prop_id]
    );

    // Customer documents (from customer profile)
    let customerDocs = [];
    try {
      const [custProfile] = await db.query(
        'SELECT id_document FROM customer_profiles WHERE user_id = ?',
        [customerId]
      );
      if (custProfile.length > 0 && custProfile[0].id_document) {
        customerDocs.push({ document_name: 'ID Document', document_type: 'identification' });
      }
    } catch (e) { /* table may not exist */ }

    const property = {
      title: agreement.title, location: agreement.location, price: agreement.price,
      type: agreement.type, area: agreement.area, status: agreement.property_status
    };

    // Generate HTML
    const html = generateAgreementHTML(agreement, property, owner, customer, ownerDocs, customerDocs);

    // Save to database
    await db.query(
      'UPDATE agreements SET agreement_html = ?, updated_at = NOW() WHERE id = ?',
      [html, agreementId]
    );

    res.json({ 
      html, 
      agreement_id: agreementId, 
      message: 'Agreement document generated successfully',
      success: true
    });
  } catch (error) {
    console.error('Generate document error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// Get agreement document HTML
router.get('/:id/document', async (req, res) => {
  try {
    const [agreements] = await db.query('SELECT agreement_html FROM agreements WHERE id = ?', [req.params.id]);
    if (agreements.length === 0 || !agreements[0].agreement_html) {
      return res.status(404).json({ message: 'Agreement document not found. Generate it first.', success: false });
    }
    res.json({ html: agreements[0].agreement_html, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// Update agreement fillable fields
router.put('/:id/update-fields', async (req, res) => {
  try {
    const { duration, payment_terms, special_conditions, additional_terms, agreement_text } = req.body;
    
    const updates = [];
    const values = [];
    
    if (duration !== undefined) { updates.push('duration = ?'); values.push(duration); }
    if (payment_terms !== undefined) { updates.push('payment_terms = ?'); values.push(payment_terms); }
    if (special_conditions !== undefined) { updates.push('special_conditions = ?'); values.push(special_conditions); }
    if (additional_terms !== undefined) { updates.push('additional_terms = ?'); values.push(additional_terms); }
    if (agreement_text !== undefined) { updates.push('agreement_text = ?'); values.push(agreement_text); }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update', success: false });
    }
    
    updates.push('updated_at = NOW()');
    values.push(req.params.id);
    
    await db.query(`UPDATE agreements SET ${updates.join(', ')} WHERE id = ?`, values);
    
    res.json({ message: 'Agreement fields updated successfully', success: true });
  } catch (error) {
    console.error('Update fields error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// Sign agreement (owner or customer)
router.put('/:id/sign', async (req, res) => {
  try {
    const { user_id, role, signature_data } = req.body;
    
    if (!signature_data) {
      return res.status(400).json({ message: 'Signature data is required', success: false });
    }

    const [agreements] = await db.query('SELECT * FROM agreements WHERE id = ?', [req.params.id]);
    if (agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    const agreement = agreements[0];
    const isOwner = String(agreement.owner_id) === String(user_id);
    const isCustomer = String(agreement.customer_id) === String(user_id);

    if (!isOwner && !isCustomer) {
      return res.status(403).json({ message: 'Only agreement parties can sign', success: false });
    }

    if (isOwner) {
      await db.query(
        'UPDATE agreements SET owner_signature = ?, owner_signed_at = NOW(), updated_at = NOW() WHERE id = ?',
        [signature_data, req.params.id]
      );
    } else {
      await db.query(
        'UPDATE agreements SET customer_signature = ?, customer_signed_at = NOW(), updated_at = NOW() WHERE id = ?',
        [signature_data, req.params.id]
      );
    }

    // Check if both parties signed — activate the agreement
    const [updated] = await db.query('SELECT owner_signature, customer_signature FROM agreements WHERE id = ?', [req.params.id]);
    if (updated[0].owner_signature && updated[0].customer_signature) {
      await db.query('UPDATE agreements SET status = "active", updated_at = NOW() WHERE id = ?', [req.params.id]);
    }

    // Notify the other party
    const notifyUserId = isOwner ? agreement.customer_id : agreement.owner_id;
    const signerName = isOwner ? 'Owner' : 'Customer';
    if (notifyUserId) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [notifyUserId, 'Agreement Signed', `The ${signerName} has signed agreement #${req.params.id}.`, 'success']
      );
    }

    res.json({ message: `Agreement signed by ${signerName} successfully`, success: true });
  } catch (error) {
    console.error('Sign agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// Send agreement to other party
router.post('/:id/send', async (req, res) => {
  try {
    const { sender_id } = req.body;

    const [agreements] = await db.query(`
      SELECT a.*, p.title as property_title
      FROM agreements a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (agreements.length === 0) {
      return res.status(404).json({ message: 'Agreement not found', success: false });
    }

    const agreement = agreements[0];
    const isOwner = String(agreement.owner_id) === String(sender_id);
    const recipientId = isOwner ? agreement.customer_id : agreement.owner_id;

    if (!recipientId) {
      return res.status(400).json({ message: 'No recipient found', success: false });
    }

    // Create notification 
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)',
      [recipientId, 'Agreement Document Sent', `An agreement document for "${agreement.property_title}" has been sent to you for review and signing.`, 'info', req.params.id]
    );

    // Also send as a message
    const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [sender_id]);
    await db.query(
      'INSERT INTO messages (sender_id, receiver_id, subject, message, message_type, is_read, is_group, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, NOW())',
      [sender_id, recipientId, `Agreement Document - ${agreement.property_title}`, 
       `${sender[0]?.name || 'A party'} has sent you the agreement document for "${agreement.property_title}". Please review, fill in required fields, and sign the agreement.`,
       'property']
    );

    // Update agreement status to pending if it's still draft
    if (agreement.status === 'draft') {
      await db.query('UPDATE agreements SET status = "pending", updated_at = NOW() WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Agreement sent successfully', success: true });
  } catch (error) {
    console.error('Send agreement error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// Update agreement status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, signed_by_customer_id } = req.body;

    await db.query('UPDATE agreements SET status = ?, updated_at = NOW() WHERE id = ?', [status, req.params.id]);

    if (signed_by_customer_id) {
      const [agreements] = await db.query('SELECT * FROM agreements WHERE id = ?', [req.params.id]);
      if (agreements.length > 0) {
        const agreement = agreements[0];
        const recipient = agreement.owner_id || agreement.broker_id;
        if (recipient) {
          await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [recipient, 'Agreement Signed', `Customer signed agreement #${agreement.id} for property ${agreement.property_id}.`, 'success']
          );
        }
      }
    }

    res.json({ message: 'Agreement status updated', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
