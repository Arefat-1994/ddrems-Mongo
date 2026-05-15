const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Users, BrokerProfiles, OwnerProfiles, CustomerProfiles, Notifications, Messages } = require('../models');
const { sendEmail, templates } = require('../services/emailService');
const { upload } = require('../middleware/upload');
const bcrypt = require('bcryptjs');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await Users.find().sort({ created_at: -1 }).select('-password').lean();
    const mappedUsers = users.map(user => ({
      ...user,
      id: user._id
    }));
    res.json(mappedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search users by name, email, phone, or ID
router.get('/search', async (req, res) => {
  try {
    const { q, role } = req.query;
    let query = {};

    if (q) {
      if (mongoose.Types.ObjectId.isValid(q.trim())) {
        query.$or = [{ _id: q.trim() }];
      } else {
        query.$or = [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } }
        ];
      }
    }

    if (role) {
      query.role = role;
    }

    const users = await Users.find(query).limit(20).select('-password').lean();
    const mappedUsers = users.map(user => ({
      ...user,
      id: user._id
    }));
    res.json(mappedUsers);
  } catch (error) {
    console.error('[USER-API] Search failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID (with role-specific profile data)
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: 'Invalid User ID' });
    }

    const user = await Users.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;
    if (user.role === 'broker') {
      profile = await BrokerProfiles.findOne({ user_id: userId }).lean();
    } else if (user.role === 'owner') {
      profile = await OwnerProfiles.findOne({ user_id: userId }).lean();
    } else if (user.role === 'user') {
      profile = await CustomerProfiles.findOne({ user_id: userId }).lean();
    }

    if (profile) {
      Object.assign(user, profile);
    }

    // Map _id to id for frontend compatibility
    user.id = user._id;

    res.json(user);
  } catch (error) {
    console.error(`[USER-API] Get by ID failed:`, error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
  try {
    const users = await Users.find({ role: req.params.role }).sort({ name: 1 }).select('-password').lean();
    const mappedUsers = users.map(user => ({
      ...user,
      id: user._id
    }));
    res.json(mappedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (General) - Explicit route
router.put('/update/:id', async (req, res) => {
  try {
    const { name, email, role, status, profile_approved } = req.body;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: 'Invalid User ID' });
    }

    const currentUser = await Users.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;
    if (profile_approved !== undefined) updates.profile_approved = profile_approved ? true : false;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    await Users.findByIdAndUpdate(userId, updates);

    // Notifications
    if (status === 'active' && currentUser.status !== 'active') {
      const emailData = templates.accountApproved(currentUser.name);
      await sendEmail(currentUser.email, emailData.subject, emailData.html);
    } else if (profile_approved === true && currentUser.profile_approved !== true) {
      const emailData = {
        subject: 'Your Profile has been Approved! - Dire Dawa Real Estate Management system',
        html: `<h2>Congratulations!</h2><p>Your detailed profile has been approved. You now have full access to the system.</p>`
      };
      await sendEmail(currentUser.email, emailData.subject, emailData.html);
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('[USER-API] Update failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user account (Admin functionality)
router.post('/add', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || name.trim().length < 3) return res.status(400).json({ message: 'Full name must be at least 3 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Please provide a valid email address' });
    
    if (phone) {
      const cleanPhone = phone.replace(/\s/g, '');
      if (!/^(\+251|0)9[0-9]{8}$/.test(cleanPhone)) {
        return res.status(400).json({ message: 'Please provide a valid Ethiopian phone number' });
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (!role) {
      return res.status(400).json({ message: 'User role is required' });
    }

    const existing = await Users.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password || 'admin123', 10);

    const newUser = await Users.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role,
      status: 'active',
      profile_approved: false,
      profile_completed: false
    });

    res.json({
      success: true,
      user_id: newUser._id,
      message: 'User account created successfully'
    });
  } catch (error) {
    console.error('[USER-API] Create failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ message: 'Invalid User ID' });
    }

    const user = await Users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (['admin', 'system_admin'].includes(user.role)) {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }

    // Delete related profile data
    await CustomerProfiles.deleteMany({ user_id: userId });
    await OwnerProfiles.deleteMany({ user_id: userId });
    await BrokerProfiles.deleteMany({ user_id: userId });
    await Notifications.deleteMany({ user_id: userId });
    await Messages.deleteMany({ $or: [{ sender_id: userId }, { receiver_id: userId }] });

    await Users.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    await Users.findByIdAndUpdate(userId, { 
      name, 
      ...(phone && { phone }) 
    });

    const user = await Users.findById(userId);
    if (user) {
      if (user.role === 'broker') {
        await BrokerProfiles.findOneAndUpdate({ user_id: userId }, { full_name: name });
      } else if (user.role === 'owner') {
        await OwnerProfiles.findOneAndUpdate({ user_id: userId }, { full_name: name });
      } else if (user.role === 'user') {
        await CustomerProfiles.findOneAndUpdate({ user_id: userId }, { full_name: name });
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[USER-API] Profile update failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload profile photo
router.post('/upload-photo/:id', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const photoUrl = req.file.path; // Cloudinary returns URL in req.file.path
    
    await Users.findByIdAndUpdate(userId, { profile_image: photoUrl });

    const user = await Users.findById(userId);
    if (user) {
      if (user.role === 'broker') {
        await BrokerProfiles.findOneAndUpdate({ user_id: userId }, { profile_photo: photoUrl });
      } else if (user.role === 'owner') {
        await OwnerProfiles.findOneAndUpdate({ user_id: userId }, { profile_photo: photoUrl });
      } else if (user.role === 'user') {
        await CustomerProfiles.findOneAndUpdate({ user_id: userId }, { profile_photo: photoUrl });
      }
    }

    res.json({ 
      message: 'Profile photo uploaded successfully', 
      photoUrl: photoUrl 
    });
  } catch (error) {
    console.error('[USER-API] Photo upload failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Catch-all
router.use((req, res) => {
  res.status(404).json({ message: 'User API: Endpoint not found' });
});

module.exports = router;
