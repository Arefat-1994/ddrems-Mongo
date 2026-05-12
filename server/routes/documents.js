const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyDocuments, AgreementDocuments, Notifications, Properties } = require('../models');
const { upload } = require('../middleware/upload');

router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const docs = await PropertyDocuments.find({ property_id: req.params.propertyId }).sort({ uploaded_at: -1 }).lean();
    res.json(docs.map(d => ({ ...d, id: d._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/property-doc/:docId', async (req, res) => {
  try {
    const doc = await PropertyDocuments.findById(req.params.docId).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ...doc, id: doc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/property/:propertyId', upload.single('document'), async (req, res) => {
  try {
    const { document_type, document_name, access_key, uploaded_by, is_locked } = req.body;
    let document_path = '';
    if (req.file) document_path = req.file.path;

    const newDoc = await PropertyDocuments.create({
      property_id: req.params.propertyId,
      document_type,
      document_name: document_name || (req.file ? req.file.originalname : 'Document'),
      document_path,
      access_key,
      uploaded_by,
      is_locked: is_locked === 'true' || is_locked === true,
      uploaded_at: new Date()
    });

    res.json({ message: 'Success', success: true, id: newDoc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/property-doc/:docId', async (req, res) => {
  try {
    await PropertyDocuments.findByIdAndDelete(req.params.docId);
    res.json({ message: 'Deleted', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/agreement/:agreementId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.agreementId)) return res.json([]);
    const docs = await AgreementDocuments.find({ agreement_request_id: req.params.agreementId }).sort({ created_at: -1 }).lean();
    res.json(docs.map(d => ({ ...d, id: d._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/agreement-doc/:docId', async (req, res) => {
  try {
    const doc = await AgreementDocuments.findById(req.params.docId).lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ ...doc, id: doc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/agreement/:agreementId', upload.single('document'), async (req, res) => {
  try {
    const { document_type, version, generated_by_id } = req.body;
    
    // For agreement documents, sometimes it's an uploaded file or html content.
    // Assuming file upload here based on standard documents
    const newDoc = await AgreementDocuments.create({
      agreement_request_id: req.params.agreementId,
      document_type,
      version: version || 1,
      document_content: req.file ? req.file.path : req.body.document_content,
      generated_by_id,
      generated_date: new Date(),
      created_at: new Date()
    });

    res.json({ message: 'Success', success: true, id: newDoc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/agreement-doc/:docId', async (req, res) => {
  try {
    await AgreementDocuments.findByIdAndUpdate(req.params.docId, req.body);
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/agreement-doc/:docId', async (req, res) => {
  try {
    await AgreementDocuments.findByIdAndDelete(req.params.docId);
    res.json({ message: 'Deleted', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});



module.exports = router;
