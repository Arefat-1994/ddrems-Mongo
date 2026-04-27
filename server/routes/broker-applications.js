const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');

// Multer storage for documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads');
    const fs = require('fs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// POST /api/broker-applications - Submit a new application
router.post('/', upload.fields([
  { name: 'profile_photo', maxCount: 1 },
  { name: 'id_document', maxCount: 1 }, 
  { name: 'license_document', maxCount: 1 }
]), async (req, res) => {
  try {
    const { full_name, email, phone_number } = req.body;

    if (!req.files['profile_photo'] || !req.files['id_document'] || !req.files['license_document']) {
      return res.status(400).json({ message: 'Profile photo, ID and License documents are all required.' });
    }

    const profilePhotoPath = '/uploads/' + req.files['profile_photo'][0].filename;
    const idDocumentPath = '/uploads/' + req.files['id_document'][0].filename;
    const licenseDocumentPath = '/uploads/' + req.files['license_document'][0].filename;

    const [existing] = await db.query('SELECT id FROM broker_applications WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'An application with this email already exists.' });
    }

    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    await db.query(
      'INSERT INTO broker_applications (full_name, email, phone_number, profile_photo, id_document, license_document, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [full_name, email, phone_number, profilePhotoPath, idDocumentPath, licenseDocumentPath, 'pending']
    );

    res.status(201).json({ message: 'Application submitted successfully. We will notify you once reviewed.' });
  } catch (error) {
    console.error('Broker application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/broker-applications - Admin view all applications
router.get('/', async (req, res) => {
  try {
    const [applications] = await db.query('SELECT * FROM broker_applications ORDER BY created_at DESC');
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/broker-applications/:id/approve - Admin approve application
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const [applications] = await db.query('SELECT * FROM broker_applications WHERE id = ?', [id]);
    
    if (applications.length === 0) {
      return res.status(404).json({ message: 'Application not found.' });
    }
    
    const app = applications[0];
    if (app.status !== 'pending') {
      return res.status(400).json({ message: 'Application is already ' + app.status });
    }

    // Generate random password
    const plainPassword = Math.random().toString(36).slice(-10) + '!A1';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user account (profile NOT completed yet — broker must fill it in after login)
    const [userResult] = await db.query(
      'INSERT INTO users (name, email, phone, password, role, status, profile_approved, profile_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [app.full_name, app.email, app.phone_number, hashedPassword, 'broker', 'active', false, false]
    );

    // NOTE: We do NOT create a broker_profiles row here.
    // The broker must log in, complete the full profile form (photo, ID, license, address),
    // and submit it. Then the system admin approves the profile for full access.

    // Update application status
    await db.query('UPDATE broker_applications SET status = ? WHERE id = ?', ['approved', id]);

    // Send email to broker
    const emailData = {
      subject: 'Broker Application Approved - Welcome to DDREMS!',
      html: `
        <h2>Congratulations ${app.full_name}!</h2>
        <p>Your application to join Dire Dawa Real Estate Management System as a broker has been approved.</p>
        <p>Here are your login credentials:</p>
        <p><strong>Email:</strong> ${app.email}</p>
        <p><strong>Password:</strong> ${plainPassword}</p>
        <hr/>
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Log in with the credentials above</li>
          <li>Complete your full broker profile (photo, ID document, license, address)</li>
          <li>Submit your profile for admin approval</li>
          <li>Once approved, you will have full access to all broker services</li>
        </ol>
        <p>Please also change your password immediately after logging in.</p>
        <br/>
        <p>Best Regards,</p>
        <p>The DDREMS Admin Team</p>
      `
    };
    await sendEmail(app.email, emailData.subject, emailData.html);

    res.json({ message: 'Application approved and account created. Broker must complete their profile after login.' });
  } catch (error) {
    console.error('Error approving application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/broker-applications/:id/reject - Admin reject application
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE broker_applications SET status = ? WHERE id = ?', ['rejected', id]);
    res.json({ message: 'Application rejected.' });
  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
