const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// Auto-converted from PostgreSQL - broker-applications.js
// All models available via require('../models')
const { BrokerApplications, Users, Notifications } = require('../models');
const { sendEmail, templates } = require('../services/emailService');
const { upload } = require('../middleware/upload');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

router.post('/', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_document', maxCount: 1 },
  { name: 'license_document', maxCount: 1 }
]), async (req, res) => {
  try {
    const { full_name, email, phone_number } = req.body;
    
    if (!full_name || !email) {
      return res.status(400).json({ success: false, message: 'Missing required information.' });
    }

    // Check if email already exists in users or applications
    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered as a user.' });
    }
    const existingApp = await BrokerApplications.findOne({ email, status: 'pending' });
    if (existingApp) {
      return res.status(400).json({ success: false, message: 'An application is already pending for this email.' });
    }

    // Extract file paths
    const profile_photo = req.files['profile_photo'] ? req.files['profile_photo'][0].path : null;
    const id_document = req.files['id_document'] ? req.files['id_document'][0].path : null;
    const license_document = req.files['license_document'] ? req.files['license_document'][0].path : null;

    const newApp = await BrokerApplications.create({
      full_name, 
      email, 
      phone_number, 
      id_document, 
      license_document, 
      profile_photo, 
      status: 'pending', 
      created_at: new Date(), 
      updated_at: new Date()
    });

    // Send confirmation email to applicant
    await sendEmail(
      email,
      'Broker Application Received - DDREMS',
      `
        <h2>Hello ${full_name},</h2>
        <p>Thank you for your application to become a broker on our platform.</p>
        <p>Your application is currently being reviewed by our administration team. This process typically takes 1-2 business days.</p>
        <p>We will notify you via email as soon as a decision has been made.</p>
        <p>Best regards,<br/>The DDREMS Team</p>
      `
    );

    res.json({ message: 'Application submitted successfully', success: true, id: newApp._id });
  } catch (error) { 
    console.error('Broker App Submission Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message }); 
  }
});

router.get('/', async (req, res) => {
  try { 
    const applications = await BrokerApplications.find().sort({ created_at: -1 }).lean();
    res.json(applications.map(app => ({ ...app, id: app._id }))); 
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/approve', async (req, res) => {
  try { 
    const application = await BrokerApplications.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    // Generate random password
    const plainPassword = crypto.randomBytes(4).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user — account is activated but profile is NOT approved yet.
    // Broker must login, complete their profile, and then admin approves the profile separately.
    const newUser = await Users.create({
      name: application.full_name,
      email: application.email,
      phone: application.phone_number,
      password: hashedPassword,
      role: 'broker',
      status: 'active',
      profile_approved: false,  // Profile must be approved separately after completion
      profile_completed: false, // Broker must complete their profile details on first login
      photo_url: application.profile_photo || null
    });

    application.status = 'approved';
    application.updated_at = new Date();
    await application.save();

    const loginUrl = `http://${req.hostname}:3000/login`;

    // Send email to broker
    await sendEmail(
      application.email,
      'Your Broker Application has been Approved - Account Activated!',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Congratulations ${application.full_name}!</h2>
          <p>Your application to become a broker has been <strong>approved</strong> and your account has been <strong>activated</strong>.</p>
          <p>You can now login using the following credentials:</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${application.email}</p>
            <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${plainPassword}</p>
          </div>
          <p><strong>Next Steps to Get Full Access:</strong></p>
          <ol>
            <li>Login to your account using the credentials above.</li>
            <li>Change your temporary password immediately.</li>
            <li><strong>Complete your broker profile</strong> (personal info, license number, and documents).</li>
            <li>Submit your profile for admin review.</li>
            <li>Once your profile is <strong>approved by the admin</strong>, you will gain full access to the broker dashboard and all services.</li>
          </ol>
          <div style="background: #fffbeb; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> You will NOT have access to the broker dashboard or services until your profile is completed and approved by an administrator.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Account</a>
          </div>
          <p style="color: #64748b; font-size: 0.9rem;">If you have any questions, please contact our support team.</p>
        </div>
      `
    );

    res.json({ message: 'Application approved successfully', success: true }); 
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:id/reject', async (req, res) => {
  try { 
    const application = await BrokerApplications.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    
    application.status = 'rejected';
    application.updated_at = new Date();
    await application.save();

    await sendEmail(
      application.email,
      'Broker Application Status',
      `
        <h2>Hello ${application.full_name},</h2>
        <p>Thank you for your interest in becoming a broker on our platform.</p>
        <p>Unfortunately, after careful review, your application has been rejected at this time.</p>
      `
    );

    res.json({ message: 'Application rejected successfully', success: true }); 
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const application = await BrokerApplications.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json({ message: 'Application record deleted successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
