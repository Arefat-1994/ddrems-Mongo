const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Check if user profile is approved
router.get('/check-approval/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [users] = await db.query(
      'SELECT id, profile_completed, profile_approved, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    res.json({
      userId: user.id,
      profileCompleted: user.profile_completed,
      profileApproved: user.profile_approved,
      role: user.role,
      isApproved: user.profile_approved === 1,
      needsCompletion: user.profile_completed === 0,
      needsApproval: user.profile_completed === 1 && user.profile_approved === 0
    });
  } catch (error) {
    console.error('Profile approval check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get profile completion status
router.get('/completion-status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [status] = await db.query(
      'SELECT * FROM profile_completion_status WHERE user_id = ?',
      [userId]
    );

    if (status.length === 0) {
      // Create default status
      await db.query(
        'INSERT INTO profile_completion_status (user_id, user_role, completion_percentage) SELECT id, role, 0 FROM users WHERE id = ?',
        [userId]
      );
      return res.json({
        userId,
        basicInfoCompleted: false,
        contactInfoCompleted: false,
        addressInfoCompleted: false,
        documentsUploaded: false,
        verificationCompleted: false,
        completionPercentage: 0
      });
    }

    res.json({
      userId: status[0].user_id,
      basicInfoCompleted: status[0].basic_info_completed === 1,
      contactInfoCompleted: status[0].contact_info_completed === 1,
      addressInfoCompleted: status[0].address_info_completed === 1,
      documentsUploaded: status[0].documents_uploaded === 1,
      verificationCompleted: status[0].verification_completed === 1,
      completionPercentage: status[0].completion_percentage
    });
  } catch (error) {
    console.error('Completion status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit profile for approval
router.post('/submit-for-approval/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    // Check if profile is completed
    const [users] = await db.query(
      'SELECT profile_completed, profile_approved FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (users[0].profile_completed === 0) {
      return res.status(400).json({ message: 'Profile is not complete. Please fill all required fields.' });
    }

    if (users[0].profile_approved === 1) {
      return res.status(400).json({ message: 'Profile is already approved' });
    }

    // Update user profile status
    await db.query(
      'UPDATE users SET profile_submitted_at = NOW() WHERE id = ?',
      [userId]
    );

    // Log the submission
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    await db.query(
      'INSERT INTO profile_approval_log (user_id, user_role, action, status, notes) VALUES (?, ?, ?, ?, ?)',
      [userId, user[0].role, 'submitted', 'pending', notes || 'Profile submitted for approval']
    );

    res.json({
      message: 'Profile submitted for approval. Please wait for admin approval.',
      status: 'pending'
    });
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update profile completion status
router.post('/update-completion/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      basicInfoCompleted,
      contactInfoCompleted,
      addressInfoCompleted,
      documentsUploaded,
      verificationCompleted
    } = req.body;

    // Calculate completion percentage
    const completedFields = [
      basicInfoCompleted,
      contactInfoCompleted,
      addressInfoCompleted,
      documentsUploaded,
      verificationCompleted
    ].filter(Boolean).length;

    const completionPercentage = Math.round((completedFields / 5) * 100);

    // Check if all fields are completed
    const allCompleted = completedFields === 5;

    // Update or insert completion status
    const [existing] = await db.query(
      'SELECT id FROM profile_completion_status WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE profile_completion_status 
         SET basic_info_completed = ?, 
             contact_info_completed = ?, 
             address_info_completed = ?, 
             documents_uploaded = ?, 
             verification_completed = ?, 
             completion_percentage = ?
         WHERE user_id = ?`,
        [
          basicInfoCompleted ? 1 : 0,
          contactInfoCompleted ? 1 : 0,
          addressInfoCompleted ? 1 : 0,
          documentsUploaded ? 1 : 0,
          verificationCompleted ? 1 : 0,
          completionPercentage,
          userId
        ]
      );
    } else {
      await db.query(
        `INSERT INTO profile_completion_status 
         (user_id, user_role, basic_info_completed, contact_info_completed, address_info_completed, documents_uploaded, verification_completed, completion_percentage)
         SELECT id, role, ?, ?, ?, ?, ?, ? FROM users WHERE id = ?`,
        [
          basicInfoCompleted ? 1 : 0,
          contactInfoCompleted ? 1 : 0,
          addressInfoCompleted ? 1 : 0,
          documentsUploaded ? 1 : 0,
          verificationCompleted ? 1 : 0,
          completionPercentage,
          userId
        ]
      );
    }

    // If all completed, update user profile_completed flag
    if (allCompleted) {
      await db.query(
        'UPDATE users SET profile_completed = TRUE WHERE id = ?',
        [userId]
      );
    }

    res.json({
      message: 'Profile completion status updated',
      completionPercentage,
      allCompleted
    });
  } catch (error) {
    console.error('Update completion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get approval history
router.get('/approval-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [history] = await db.query(
      `SELECT id, action, status, notes, approved_by, created_at 
       FROM profile_approval_log 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      userId,
      history: history || []
    });
  } catch (error) {
    console.error('Approval history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
