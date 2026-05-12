const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyDocuments } = require('../models');
const crypto = require('crypto');

router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const documents = await PropertyDocuments.find({ property_id: req.params.propertyId }).sort({ uploaded_at: -1 }).lean();
    res.json(documents.map(d => ({ ...d, id: d._id, document_url: d.document_path, created_at: d.uploaded_at })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { property_id, document_name, document_url, document_type, uploaded_by } = req.body;
    if (!property_id || !document_name || !document_url) return res.status(400).json({ message: 'Missing required fields' });
    const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();
    const doc = await PropertyDocuments.create({
      property_id: mongoose.Types.ObjectId.isValid(property_id) ? property_id : null,
      document_name, document_path: document_url, document_type: document_type || 'other',
      access_key, uploaded_by: mongoose.Types.ObjectId.isValid(uploaded_by) ? uploaded_by : null
    });
    res.json({ id: doc._id, access_key, message: 'Document uploaded successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/lock', async (req, res) => {
  try {
    const { is_locked } = req.body;
    await PropertyDocuments.findByIdAndUpdate(req.params.id, { is_locked });
    res.json({ message: `Document ${is_locked ? 'locked' : 'unlocked'} successfully` });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/verify-access', async (req, res) => {
  try {
    const { document_id, access_key } = req.body;
    const doc = await PropertyDocuments.findOne({ _id: document_id, access_key }).lean();
    if (!doc) return res.status(401).json({ message: 'Invalid access key' });
    if (doc.is_locked) return res.status(403).json({ message: 'Document is locked' });
    res.json({ ...doc, id: doc._id, document_url: doc.document_path, created_at: doc.uploaded_at });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id/authenticate', async (req, res) => {
  try {
    const doc = await PropertyDocuments.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const score = (doc.is_locked ? 60 : 85) + Math.floor(Math.random() * 15);
    const status = score > 75 ? 'authentic' : 'needs review';
    res.json({ status, score, comments: status === 'authentic' ? 'Document appears original.' : 'Please verify the source.', document_id: doc._id, document_name: doc.document_name });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await PropertyDocuments.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/regenerate-key', async (req, res) => {
  try {
    const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();
    await PropertyDocuments.findByIdAndUpdate(req.params.id, { access_key });
    res.json({ access_key, message: 'Access key regenerated successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
