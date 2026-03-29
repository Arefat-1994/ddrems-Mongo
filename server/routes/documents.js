const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// PROPERTY DOCUMENTS ENDPOINTS
// ============================================================================

// Get all documents for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [documents] = await db.query(
      `SELECT pd.*, u.name as uploaded_by_name
       FROM property_documents pd
       LEFT JOIN users u ON pd.uploaded_by = u.id
       WHERE pd.property_id = ?
       ORDER BY pd.uploaded_at DESC`,
      [req.params.propertyId]
    );
    res.json(documents || []);
  } catch (error) {
    console.error('Error fetching property documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single property document
router.get('/property-doc/:docId', async (req, res) => {
  try {
    const [documents] = await db.query(
      `SELECT pd.*, u.name as uploaded_by_name
       FROM property_documents pd
       LEFT JOIN users u ON pd.uploaded_by = u.id
       WHERE pd.id = ?`,
      [req.params.docId]
    );
    
    if (documents.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(documents[0]);
  } catch (error) {
    console.error('Error fetching property document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property document
router.post('/property/:propertyId', async (req, res) => {
  try {
    const { document_type, document_name, document_path, uploaded_by } = req.body;

    const [result] = await db.query(
      `INSERT INTO property_documents (property_id, document_type, document_name, document_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.propertyId, document_type, document_name, document_path, uploaded_by]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading property document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property document
router.delete('/property-doc/:docId', async (req, res) => {
  try {
    await db.query('DELETE FROM property_documents WHERE id = ?', [req.params.docId]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting property document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// AGREEMENT DOCUMENTS ENDPOINTS
// ============================================================================

// Get all documents for an agreement
router.get('/agreement/:agreementId', async (req, res) => {
  try {
    const [documents] = await db.query(
      `SELECT ad.*, u.name as generated_by_name
       FROM agreement_documents ad
       LEFT JOIN users u ON ad.generated_by_id = u.id
       WHERE ad.agreement_request_id = ?
       ORDER BY ad.version DESC`,
      [req.params.agreementId]
    );
    res.json(documents || []);
  } catch (error) {
    console.error('Error fetching agreement documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single agreement document
router.get('/agreement-doc/:docId', async (req, res) => {
  try {
    const [documents] = await db.query(
      `SELECT ad.*, u.name as generated_by_name
       FROM agreement_documents ad
       LEFT JOIN users u ON ad.generated_by_id = u.id
       WHERE ad.id = ?`,
      [req.params.docId]
    );
    
    if (documents.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    res.json(documents[0]);
  } catch (error) {
    console.error('Error fetching agreement document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create agreement document
router.post('/agreement/:agreementId', async (req, res) => {
  try {
    const { version, document_type, document_content, generated_by_id } = req.body;

    const [result] = await db.query(
      `INSERT INTO agreement_documents (agreement_request_id, version, document_type, document_content, generated_by_id)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.agreementId, version || 1, document_type, document_content, generated_by_id]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Agreement document created successfully'
    });
  } catch (error) {
    console.error('Error creating agreement document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update agreement document
router.put('/agreement-doc/:docId', async (req, res) => {
  try {
    const { document_content, document_type } = req.body;

    await db.query(
      `UPDATE agreement_documents 
       SET document_content = ?, document_type = ?, updated_at = NOW()
       WHERE id = ?`,
      [document_content, document_type, req.params.docId]
    );

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating agreement document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete agreement document
router.delete('/agreement-doc/:docId', async (req, res) => {
  try {
    await db.query('DELETE FROM agreement_documents WHERE id = ?', [req.params.docId]);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting agreement document:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// DOCUMENT ACCESS ENDPOINTS
// ============================================================================

// Get document access requests
router.get('/access-requests/:propertyId', async (req, res) => {
  try {
    const [requests] = await db.query(
      `SELECT dar.*, u.name as user_name, u.email
       FROM document_access dar
       LEFT JOIN users u ON dar.user_id = u.id
       WHERE dar.property_id = ?
       ORDER BY dar.requested_at DESC`,
      [req.params.propertyId]
    );
    res.json(requests || []);
  } catch (error) {
    console.error('Error fetching document access requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Request document access
router.post('/request-access', async (req, res) => {
  try {
    const { property_id, user_id } = req.body;

    // Check if request already exists
    const [existing] = await db.query(
      'SELECT id FROM document_access WHERE property_id = ? AND user_id = ? AND status = "pending"',
      [property_id, user_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Access request already pending' });
    }

    const [result] = await db.query(
      'INSERT INTO document_access (property_id, user_id, status) VALUES (?, ?, "pending")',
      [property_id, user_id]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Access request submitted'
    });
  } catch (error) {
    console.error('Error requesting document access:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve document access
router.put('/access-request/:requestId/approve', async (req, res) => {
  try {
    const { response_message } = req.body;

    await db.query(
      `UPDATE document_access 
       SET status = 'approved', response_message = ?, responded_at = NOW()
       WHERE id = ?`,
      [response_message || 'Access approved', req.params.requestId]
    );

    res.json({ message: 'Access approved' });
  } catch (error) {
    console.error('Error approving access:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject document access
router.put('/access-request/:requestId/reject', async (req, res) => {
  try {
    const { response_message } = req.body;

    await db.query(
      `UPDATE document_access 
       SET status = 'rejected', response_message = ?, responded_at = NOW()
       WHERE id = ?`,
      [response_message || 'Access rejected', req.params.requestId]
    );

    res.json({ message: 'Access rejected' });
  } catch (error) {
    console.error('Error rejecting access:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
