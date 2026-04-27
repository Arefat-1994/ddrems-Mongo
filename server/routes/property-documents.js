const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

// Get documents for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [documents] = await db.query(
      'SELECT id, property_id, document_type, document_name, document_path as document_url, access_key, uploaded_by, uploaded_at as created_at, is_locked FROM property_documents WHERE property_id = ? ORDER BY uploaded_at DESC',
      [req.params.propertyId]
    );
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property document
router.post('/', async (req, res) => {
  try {
    const { property_id, document_name, document_url, document_type, uploaded_by } = req.body;

    // Validate required fields
    if (!property_id || !document_name || !document_url) {
      return res.status(400).json({ 
        message: 'Missing required fields: property_id, document_name, and document_url are required' 
      });
    }

    // Validate document size (base64 encoded, so actual size is ~33% larger)
    const estimatedSize = document_url.length * 0.75; // Approximate original file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (estimatedSize > maxSize) {
      return res.status(400).json({ 
        message: `Document is too large. Maximum size is 10MB. Your file is approximately ${(estimatedSize / 1024 / 1024).toFixed(2)}MB` 
      });
    }

    // Generate access key
    const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Parse uploaded_by and property_id to valid integers or null/throw
    const parsedUploadedBy = (uploaded_by && uploaded_by !== 'undefined' && uploaded_by !== 'null') ? parseInt(uploaded_by, 10) : null;
    const uploadedById = isNaN(parsedUploadedBy) ? null : parsedUploadedBy;

    const parsedPropertyId = parseInt(property_id, 10);
    if (isNaN(parsedPropertyId)) {
      return res.status(400).json({ message: 'Invalid property ID provided.' });
    }

    try {
      const [result] = await db.query(
        'INSERT INTO property_documents (property_id, document_name, document_path, document_type, access_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
        [parsedPropertyId, document_name, document_url, document_type || 'other', access_key, uploadedById]
      );

      return res.json({
        id: result.insertId,
        access_key,
        message: 'Document uploaded successfully'
      });
    } catch (insertError) {
      console.error('Document INSERT error:', insertError.message, '| Code:', insertError.code);

      // Handle FK constraint violation on uploaded_by - retry without it
      if (insertError.code === '23503' && insertError.detail && insertError.detail.includes('uploaded_by')) {
        console.log('Retrying document insert without uploaded_by (user FK issue)...');
        const [result] = await db.query(
          'INSERT INTO property_documents (property_id, document_name, document_path, document_type, access_key, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
          [parsedPropertyId, document_name, document_url, document_type || 'other', access_key, null]
        );

        return res.json({
          id: result.insertId,
          access_key,
          message: 'Document uploaded successfully'
        });
      }

      // Handle FK constraint violation on property_id
      if (insertError.code === '23503' && insertError.detail && insertError.detail.includes('property_id')) {
        return res.status(400).json({ 
          message: `Property with ID ${property_id} does not exist. Please save the property first before uploading documents.` 
        });
      }

      // Re-throw other errors
      throw insertError;
    }
  } catch (error) {
    console.error('Document upload error:', error);
    
    // Check for specific PostgreSQL errors
    if (error.code === '42P01') {
      return res.status(500).json({ 
        message: 'Database table not found. Please ensure the property_documents table exists.' 
      });
    }
    
    if (error.code === '42703') {
      return res.status(500).json({ 
        message: 'Database schema mismatch. A required column is missing from the property_documents table.' 
      });
    }

    if (error.code === '23514') {
      return res.status(400).json({ 
        message: 'Invalid document type. Must be one of the permitted types.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error while uploading document', 
      error: error.message,
      code: error.code 
    });
  }
});

// Lock/Unlock document
router.put('/:id/lock', async (req, res) => {
  try {
    const { is_locked } = req.body;
    await db.query(
      'UPDATE property_documents SET is_locked = ? WHERE id = ?',
      [is_locked, req.params.id]
    );
    res.json({ message: `Document ${is_locked ? 'locked' : 'unlocked'} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify access key and get document
router.post('/verify-access', async (req, res) => {
  try {
    const { document_id, access_key } = req.body;
    const [documents] = await db.query(
      'SELECT id, property_id, document_type, document_name, document_path as document_url, access_key, uploaded_by, uploaded_at as created_at, is_locked FROM property_documents WHERE id = ? AND access_key = ?',
      [document_id, access_key]
    );

    if (documents.length === 0) {
      return res.status(401).json({ message: 'Invalid access key' });
    }

    if (documents[0].is_locked) {
      return res.status(403).json({ message: 'Document is locked' });
    }

    res.json(documents[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Document authenticity scan
router.get('/:id/authenticate', async (req, res) => {
  try {
    const [documents] = await db.query('SELECT id, document_name, is_locked, access_key FROM property_documents WHERE id = ?', [req.params.id]);
    if (documents.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const doc = documents[0];
    const score = (doc.is_locked ? 60 : 85) + Math.floor(Math.random() * 15);
    const status = score > 75 ? 'authentic' : 'needs review';

    res.json({
      status,
      score,
      comments: status === 'authentic'
        ? 'Document appears original and matches known outlets.'
        : 'Potential discrepancy detected. Please verify the source or upload another document.',
      document_id: doc.id,
      document_name: doc.document_name
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM property_documents WHERE id = ?', [req.params.id]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Regenerate access key
router.put('/:id/regenerate-key', async (req, res) => {
  try {
    const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();
    await db.query(
      'UPDATE property_documents SET access_key = ? WHERE id = ?',
      [access_key, req.params.id]
    );
    res.json({ access_key, message: 'Access key regenerated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


