const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// CUSTOMER PROFILE ROUTES
// ============================================================================

// Get ALL customer profiles (for admin)
router.get('/customer', async (req, res) => {
  try {
    const [profiles] = await db.query(
      `SELECT cp.*, u.name as user_name, u.email as user_email 
       FROM customer_profiles cp 
       LEFT JOIN users u ON cp.user_id = u.id 
       ORDER BY cp.created_at DESC`
    );
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer profile by user ID
router.get('/customer/:userId', async (req, res) => {
  try {
    const [profiles] = await db.query(
      `SELECT cp.*, u.name, u.email, u.phone 
       FROM customer_profiles cp 
       LEFT JOIN users u ON cp.user_id = u.id
       WHERE cp.user_id = ?`,
      [req.params.userId]
    );

    if (profiles.length === 0) {
      // If no profile exists, fetch user info anyway
      const [users] = await db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.params.userId]);
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(users[0]);
    }

    res.json(profiles[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create customer profile
router.post('/customer', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document } = req.body;

    // Check if profile already exists
    const [existing] = await db.query('SELECT * FROM customer_profiles WHERE user_id = ?', [user_id]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Profile already exists' });
    }

    const [result] = await db.query(
      `INSERT INTO customer_profiles (user_id, full_name, phone_number, address, profile_photo, id_document, profile_status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, full_name, phone_number, address, profile_photo, id_document]
    );

    // Update user table
    await db.query('UPDATE users SET profile_completed = TRUE WHERE id = ?', [user_id]);

    res.status(201).json({
      message: 'Profile created successfully. Waiting for admin approval.',
      profileId: result.insertId
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update customer profile
router.put('/customer/:id', async (req, res) => {
  try {
    const { full_name, phone_number, address, profile_photo, id_document } = req.body;

    await db.query(
      `UPDATE customer_profiles 
       SET full_name = ?, phone_number = ?, address = ?, profile_photo = ?, id_document = ?
       WHERE id = ?`,
      [full_name, phone_number, address, profile_photo, id_document, req.params.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Request edit permission for customer profile
router.post('/customer/request-edit', async (req, res) => {
  try {
    const { user_id, profile_id } = req.body;

    // Check if there's already a pending request
    const [existingRequests] = await db.query(
      'SELECT * FROM profile_edit_requests WHERE user_id = ? AND status = "pending"',
      [user_id]
    );

    if (existingRequests.length > 0) {
      return res.status(400).json({ message: 'You already have a pending edit request' });
    }

    // Create edit request
    await db.query(
      'INSERT INTO profile_edit_requests (user_id, profile_id, request_type, status) VALUES (?, ?, "customer", "pending")',
      [user_id, profile_id]
    );

    // Create notification for admin
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) SELECT id, "Profile Edit Request", CONCAT("Customer ", (SELECT name FROM users WHERE id = ?), " has requested permission to edit their profile"), "info" FROM users WHERE role = "admin"',
      [user_id]
    );

    res.json({ message: 'Edit request submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// OWNER PROFILE ROUTES
// ============================================================================

// Get ALL owner profiles (for admin)
router.get('/owner', async (req, res) => {
  try {
    const [profiles] = await db.query(
      `SELECT op.*, u.name as user_name, u.email as user_email 
       FROM owner_profiles op 
       LEFT JOIN users u ON op.user_id = u.id 
       ORDER BY op.created_at DESC`
    );
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get owner profile by user ID
router.get('/owner/:userId', async (req, res) => {
  try {
    const [profiles] = await db.query(
      `SELECT op.*, u.name, u.email, u.phone 
       FROM owner_profiles op 
       LEFT JOIN users u ON op.user_id = u.id
       WHERE op.user_id = ?`,
      [req.params.userId]
    );

    if (profiles.length === 0) {
      // If no profile exists, fetch user info anyway
      const [users] = await db.query('SELECT id, name, email, phone FROM users WHERE id = ?', [req.params.userId]);
      if (users.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(users[0]);
    }

    res.json(profiles[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create owner profile
router.post('/owner', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document, business_license } = req.body;

    // Check if profile already exists
    const [existing] = await db.query('SELECT * FROM owner_profiles WHERE user_id = ?', [user_id]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Profile already exists' });
    }

    const [result] = await db.query(
      `INSERT INTO owner_profiles (user_id, full_name, phone_number, address, profile_photo, id_document, business_license, profile_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, full_name, phone_number, address, profile_photo, id_document, business_license]
    );

    // Update user table
    await db.query('UPDATE users SET profile_completed = TRUE WHERE id = ?', [user_id]);

    res.status(201).json({
      message: 'Profile created successfully. Waiting for admin approval.',
      profileId: result.insertId
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update owner profile
router.put('/owner/:id', async (req, res) => {
  try {
    const { full_name, phone_number, address, profile_photo, id_document, business_license } = req.body;

    await db.query(
      `UPDATE owner_profiles 
       SET full_name = ?, phone_number = ?, address = ?, profile_photo = ?, id_document = ?, business_license = ?
       WHERE id = ?`,
      [full_name, phone_number, address, profile_photo, id_document, business_license, req.params.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// BROKER PROFILE ROUTES
// ============================================================================

// Get ALL broker profiles (for admin)
router.get('/broker', async (req, res) => {
  try {
    const [profiles] = await db.query(
      `SELECT bp.*, u.name as user_name, u.email as user_email 
       FROM broker_profiles bp 
       LEFT JOIN users u ON bp.user_id = u.id 
       ORDER BY bp.created_at DESC`
    );
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker profile by user ID
router.get('/broker/:userId', async (req, res) => {
  try {
    const [profiles] = await db.query(
      'SELECT * FROM broker_profiles WHERE user_id = ?',
      [req.params.userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(profiles[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create broker profile
router.post('/broker', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document, broker_license, license_number } = req.body;

    // Check if profile already exists
    const [existing] = await db.query('SELECT * FROM broker_profiles WHERE user_id = ?', [user_id]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Profile already exists' });
    }

    const [result] = await db.query(
      `INSERT INTO broker_profiles (user_id, full_name, phone_number, address, profile_photo, id_document, broker_license, license_number, profile_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, full_name, phone_number, address, profile_photo, id_document, broker_license, license_number]
    );

    // Update user table
    await db.query('UPDATE users SET profile_completed = TRUE WHERE id = ?', [user_id]);

    res.status(201).json({
      message: 'Profile created successfully. Waiting for admin approval.',
      profileId: result.insertId
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update broker profile
router.put('/broker/:id', async (req, res) => {
  try {
    const { full_name, phone_number, address, profile_photo, id_document, broker_license, license_number } = req.body;

    await db.query(
      `UPDATE broker_profiles 
       SET full_name = ?, phone_number = ?, address = ?, profile_photo = ?, id_document = ?, broker_license = ?, license_number = ?
       WHERE id = ?`,
      [full_name, phone_number, address, profile_photo, id_document, broker_license, license_number, req.params.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// ADMIN PROFILE APPROVAL ROUTES
// ============================================================================

// Get all pending profiles
router.get('/pending', async (req, res) => {
  try {
    const [customerProfiles] = await db.query(`
      SELECT cp.*, u.name as user_name, u.email as user_email, 'customer' as profile_type
      FROM customer_profiles cp
      LEFT JOIN users u ON cp.user_id = u.id
      WHERE LOWER(cp.profile_status) = 'pending'
    `);

    const [ownerProfiles] = await db.query(`
      SELECT op.*, u.name as user_name, u.email as user_email, 'owner' as profile_type
      FROM owner_profiles op
      LEFT JOIN users u ON op.user_id = u.id
      WHERE LOWER(op.profile_status) = 'pending'
    `);

    const [brokerProfiles] = await db.query(`
      SELECT bp.*, u.name as user_name, u.email as user_email, 'broker' as profile_type
      FROM broker_profiles bp
      LEFT JOIN users u ON bp.user_id = u.id
      WHERE LOWER(bp.profile_status) = 'pending'
    `);

    res.json({
      customers: customerProfiles || [],
      owners: ownerProfiles || [],
      brokers: brokerProfiles || [],
      total: (customerProfiles?.length || 0) + (ownerProfiles?.length || 0) + (brokerProfiles?.length || 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve profile (can change from any status)
router.post('/approve/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId } = req.body;

    let tableName;
    if (profileType === 'customer') tableName = 'customer_profiles';
    else if (profileType === 'owner') tableName = 'owner_profiles';
    else if (profileType === 'broker') tableName = 'broker_profiles';
    else return res.status(400).json({ message: 'Invalid profile type' });

    // Get user_id and current status
    const [profiles] = await db.query(`SELECT user_id, profile_status FROM ${tableName} WHERE id = ?`, [profileId]);

    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userId = profiles[0].user_id;
    const previousStatus = profiles[0].profile_status;

    // Update profile status
    await db.query(
      `UPDATE ${tableName} SET profile_status = 'approved', approved_by = ?, approved_at = NOW(), rejection_reason = NULL WHERE id = ?`,
      [adminId, profileId]
    );

    // Update user table
    await db.query('UPDATE users SET profile_approved = TRUE WHERE id = ?', [userId]);

    // Log the change
    await db.query(
      `INSERT INTO profile_status_history (profile_id, profile_type, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, 'approved', ?, 'Admin approval')`,
      [profileId, profileType, previousStatus, adminId]
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Profile Approved', 'Your profile has been approved. You now have full access to all features.', 'success')`,
      [userId]
    );

    res.json({ message: 'Profile approved successfully', previousStatus, newStatus: 'approved' });
  } catch (error) {
    console.error('Approve profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Suspend profile (can change from any status)
router.post('/suspend/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId, reason } = req.body;

    let tableName;
    if (profileType === 'customer') tableName = 'customer_profiles';
    else if (profileType === 'owner') tableName = 'owner_profiles';
    else if (profileType === 'broker') tableName = 'broker_profiles';
    else return res.status(400).json({ message: 'Invalid profile type' });

    // Get user_id and current status
    const [profiles] = await db.query(`SELECT user_id, profile_status FROM ${tableName} WHERE id = ?`, [profileId]);

    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userId = profiles[0].user_id;
    const previousStatus = profiles[0].profile_status;

    // Update profile status
    await db.query(
      `UPDATE ${tableName} SET profile_status = 'suspended', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [adminId, reason || 'Suspended by administrator', profileId]
    );

    // Update user table (de-approve)
    await db.query('UPDATE users SET profile_approved = FALSE WHERE id = ?', [userId]);

    // Log the change
    await db.query(
      `INSERT INTO profile_status_history (profile_id, profile_type, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, 'suspended', ?, ?)`,
      [profileId, profileType, previousStatus, adminId, reason || 'Suspended by administrator']
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Profile Suspended', ?, 'warning')`,
      [userId, `Your profile has been suspended. Reason: ${reason || 'Contact support for details.'}`]
    );

    res.json({ message: 'Profile suspended', previousStatus, newStatus: 'suspended' });
  } catch (error) {
    console.error('Suspend profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject profile (can change from any status)
router.post('/reject/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId, rejectionReason } = req.body;

    let tableName;
    if (profileType === 'customer') tableName = 'customer_profiles';
    else if (profileType === 'owner') tableName = 'owner_profiles';
    else if (profileType === 'broker') tableName = 'broker_profiles';
    else return res.status(400).json({ message: 'Invalid profile type' });

    // Get user_id and current status
    const [profiles] = await db.query(`SELECT user_id, profile_status FROM ${tableName} WHERE id = ?`, [profileId]);

    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userId = profiles[0].user_id;
    const previousStatus = profiles[0].profile_status;

    // Update profile status
    await db.query(
      `UPDATE ${tableName} SET profile_status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [adminId, rejectionReason, profileId]
    );

    // Update user table (ensure not approved)
    await db.query('UPDATE users SET profile_approved = FALSE WHERE id = ?', [userId]);

    // Log the change
    await db.query(
      `INSERT INTO profile_status_history (profile_id, profile_type, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, 'rejected', ?, ?)`,
      [profileId, profileType, previousStatus, adminId, rejectionReason]
    );

    // Create notification
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Profile Rejected', ?, 'error')`,
      [userId, `Your profile has been rejected. Reason: ${rejectionReason}`]
    );

    res.json({ message: 'Profile rejected', previousStatus, newStatus: 'rejected' });
  } catch (error) {
    console.error('Reject profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;


// Get profile status history
router.get('/history/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;

    const [history] = await db.query(`
      SELECT psh.*, u.name as changed_by_name
      FROM profile_status_history psh
      LEFT JOIN users u ON psh.changed_by = u.id
      WHERE psh.profile_id = ? AND psh.profile_type = ?
      ORDER BY psh.changed_at DESC
    `, [profileId, profileType]);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change profile status (flexible endpoint for any status change)
router.post('/change-status/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { newStatus, adminId, reason } = req.body;

    const validStatuses = ['pending', 'approved', 'rejected', 'suspended'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    let tableName;
    if (profileType === 'customer') tableName = 'customer_profiles';
    else if (profileType === 'owner') tableName = 'owner_profiles';
    else if (profileType === 'broker') tableName = 'broker_profiles';
    else return res.status(400).json({ message: 'Invalid profile type' });

    // Get user_id and current status
    const [profiles] = await db.query(`SELECT user_id, profile_status FROM ${tableName} WHERE id = ?`, [profileId]);

    if (profiles.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const userId = profiles[0].user_id;
    const previousStatus = profiles[0].profile_status;

    // Update profile status
    const rejectionReason = newStatus === 'rejected' ? reason : null;
    await db.query(
      `UPDATE ${tableName} SET profile_status = ?, approved_by = ?, approved_at = NOW(), rejection_reason = ? WHERE id = ?`,
      [newStatus, adminId, rejectionReason, profileId]
    );

    // Update user table based on new status
    const isApproved = newStatus === 'approved';
    await db.query('UPDATE users SET profile_approved = ? WHERE id = ?', [isApproved, userId]);

    // Log the change
    await db.query(
      `INSERT INTO profile_status_history (profile_id, profile_type, old_status, new_status, changed_by, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profileId, profileType, previousStatus, newStatus, adminId, reason || `Changed to ${newStatus}`]
    );

    // Create notification
    const notificationMessages = {
      approved: 'Your profile has been approved. You now have full access to all features.',
      rejected: `Your profile has been rejected. Reason: ${reason || 'See admin for details'}`,
      suspended: `Your profile has been suspended. Reason: ${reason || 'Contact support for details'}`,
      pending: 'Your profile status has been changed to pending review.'
    };

    const notificationTypes = {
      approved: 'success',
      rejected: 'error',
      suspended: 'warning',
      pending: 'info'
    };

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [userId, `Profile ${newStatus}`, notificationMessages[newStatus], notificationTypes[newStatus]]
    );

    res.json({ 
      message: `Profile status changed successfully`, 
      previousStatus, 
      newStatus,
      userId
    });
  } catch (error) {
    console.error('Change profile status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
