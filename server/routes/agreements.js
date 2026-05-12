const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Agreements, Properties, Users, PropertyDocuments, CustomerProfiles, Notifications, Messages } = require('../models');
const socket = require('../socket');

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

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID', success: false });
    const agreement = await Agreements.findById(req.params.id).lean();
    if (!agreement) return res.status(404).json({ message: 'Agreement not found', success: false });
    let property = {}, owner = {}, customer = {};
    if (agreement.property_id) { const p = await Properties.findById(agreement.property_id).lean(); if (p) property = p; }
    if (agreement.owner_id) { const o = await Users.findById(agreement.owner_id).lean(); if (o) owner = o; }
    if (agreement.customer_id) { const c = await Users.findById(agreement.customer_id).lean(); if (c) customer = c; }
    res.json({ agreement: { ...agreement, id: agreement._id, property_title: property.title, property_location: property.location, property_price: property.price, property_type: property.type, property_area: property.area, property_status: property.status, owner_name: owner.name, owner_email: owner.email, owner_phone: owner.phone, customer_name: customer.name, customer_email: customer.email, customer_phone: customer.phone }, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

const getAgreementsByField = (field) => async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const agreements = await Agreements.aggregate([
      { $match: { [field]: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $lookup: { from: 'users', localField: 'customer_id', foreignField: '_id', as: 'customer' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title', property_location: '$property.location', property_price: '$property.price', customer_name: '$customer.name', customer_email: '$customer.email', owner_name: '$owner.name', owner_email: '$owner.email' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(agreements);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
};

router.get('/owner/:userId', getAgreementsByField('owner_id'));
router.get('/broker/:userId', getAgreementsByField('broker_id'));
router.get('/customer/:userId', getAgreementsByField('customer_id'));

router.post('/', async (req, res) => {
  try {
    const { property_id, owner_id, customer_id, broker_id, agreement_text, status } = req.body;
    const ag = await Agreements.create({ property_id, owner_id, customer_id, broker_id: broker_id || null, agreement_text, status: status || 'pending' });
    res.status(201).json({ id: ag._id, message: 'Agreement created successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/generate-document', async (req, res) => {
  try {
    const agreement = await Agreements.findById(req.params.id).lean();
    if (!agreement) return res.status(404).json({ message: 'Agreement not found', success: false });
    const property = await Properties.findById(agreement.property_id).lean() || {};
    const owner = await Users.findById(agreement.owner_id).lean() || { name: 'N/A', email: 'N/A', phone: 'N/A' };
    const customer = await Users.findById(agreement.customer_id).lean() || { name: 'N/A', email: 'N/A', phone: 'N/A' };
    const ownerDocs = await PropertyDocuments.find({ property_id: agreement.property_id }).lean();
    const html = generateAgreementHTML({ ...agreement, id: agreement._id }, property, owner, customer, ownerDocs, []);
    await Agreements.findByIdAndUpdate(req.params.id, { agreement_html: html });
    res.json({ html, agreement_id: req.params.id, message: 'Generated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.get('/:id/document', async (req, res) => {
  try {
    const ag = await Agreements.findById(req.params.id).lean();
    if (!ag || !ag.agreement_html) return res.status(404).json({ message: 'Document not found', success: false });
    res.json({ html: ag.agreement_html, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.put('/:id/update-fields', async (req, res) => {
  try {
    const update = {};
    ['duration','payment_terms','special_conditions','additional_terms','agreement_text'].forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    if (Object.keys(update).length === 0) return res.status(400).json({ message: 'No fields', success: false });
    await Agreements.findByIdAndUpdate(req.params.id, update);
    res.json({ message: 'Fields updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.put('/:id/sign', async (req, res) => {
  try {
    const { user_id, signature_data } = req.body;
    if (!signature_data) return res.status(400).json({ message: 'Signature required', success: false });
    const ag = await Agreements.findById(req.params.id);
    if (!ag) return res.status(404).json({ message: 'Not found', success: false });
    const isOwner = String(ag.owner_id) === String(user_id);
    if (isOwner) { ag.owner_signature = signature_data; ag.owner_signed_at = new Date(); }
    else { ag.customer_signature = signature_data; ag.customer_signed_at = new Date(); }
    if (ag.owner_signature && ag.customer_signature) ag.status = 'active';
    await ag.save();
    res.json({ message: 'Signed successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.post('/:id/send', async (req, res) => {
  try {
    const ag = await Agreements.findById(req.params.id);
    if (!ag) return res.status(404).json({ message: 'Not found', success: false });
    const { sender_id } = req.body;
    const isOwner = String(ag.owner_id) === String(sender_id);
    const recipientId = isOwner ? ag.customer_id : ag.owner_id;
    if (recipientId) { try { await Notifications.create({ user_id: recipientId, title: 'Agreement Document Sent', message: 'An agreement document has been sent for review.', type: 'info' }); } catch(e) {} }
    if (ag.status === 'draft') { ag.status = 'pending'; await ag.save(); }
    res.json({ message: 'Agreement sent', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await Agreements.findByIdAndUpdate(req.params.id, { status });
    res.json({ message: 'Status updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
