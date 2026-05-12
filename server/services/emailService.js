const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'arefatartzy@gmail.com',
    pass: process.env.EMAIL_PASS || 'zaegbnalkrexxsxr'
  }
});

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email content in HTML
 */
const sendEmail = async (to, subject, html) => {
  try {
    // Handle both positional arguments and options object
    if (typeof to === 'object' && to !== null && !Array.isArray(to)) {
      const options = to;
      to = options.to;
      subject = options.subject;
      html = options.html;
    }

    if (!to) {
      console.warn('[EMAIL SERVICE] Attempted to send email with no recipient (to: undefined/null). Skipping.');
      return { success: false, error: 'No recipients defined' };
    }

    const fromName = process.env.EMAIL_FROM_NAME || "Dire Dawa Real Estate Management system";
    const mailOptions = {
      from: `"${fromName}" <${process.env.EMAIL_USER || 'arefatartzy@gmail.com'}>`,
      to,
      subject,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${fromName}</h1>
          </div>
          <div style="padding: 30px; line-height: 1.6; color: #333;">
            ${html}
          </div>
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #777; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Dire Dawa Real Estate Management system</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { success: true, info };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
};

/**
 * Predefined email templates
 */
const templates = {
  accountCreated: (name) => ({
    subject: 'Welcome to Dire Dawa Real Estate Management system - Account Created',
    html: `
      <h2>Hello ${name},</h2>
      <p>Thank you for registering with Dire Dawa Real Estate Management system. Your account has been successfully created.</p>
      <p><strong>Note:</strong> Your account is currently <strong>pending approval</strong> by our administrators. You will receive another email once your account is activated.</p>
      <p>Once approved, you will be able to log in and explore our real estate services.</p>
    `
  }),
  accountApproved: (name) => ({
    subject: 'Welcome to our services! Your Account is Approved - Dire Dawa Real Estate Management system',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🎉</span>
      </div>
      <h2>Welcome to our services, ${name}!</h2>
      <p>Great news! Your account on <strong>Dire Dawa Real Estate Management system</strong> has been officially <strong>approved and activated</strong>.</p>
      <p>We are excited to have you with us. You now have full access to all our real estate services, including property listings, agreements, and more.</p>
      <p>You can now log in to your dashboard to get started:</p>
      <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="http://localhost:3000/login" style="background-color: #0d47a1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">Login to Your Dashboard</a>
      </div>
      <p>If you have any questions or need assistance, our support team is always here to help.</p>
      <p>Thank you for choosing Dire Dawa Real Estate Management system!</p>
    `
  }),
  accountRejected: (name, reason) => ({
    subject: 'Update Regarding Your Dire Dawa Real Estate Management system Account',
    html: `
      <h2>Hello ${name},</h2>
      <p>We have reviewed your registration request for Dire Dawa Real Estate Management system.</p>
      <p>Unfortunately, your account could not be approved at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you have any questions, please contact our support team.</p>
    `
  }),
  paymentSuccess: (name, amount, transactionId) => ({
    subject: 'Payment Confirmation - Dire Dawa Real Estate Management system',
    html: `
      <h2>Payment Received</h2>
      <p>Hello ${name},</p>
      <p>We have successfully received your payment.</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Amount:</strong> ${amount} ETB</p>
        <p><strong>Transaction ID:</strong> ${transactionId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>Thank you for choosing Dire Dawa Real Estate Management system.</p>
    `
  }),
  securityAlert: (name, activity) => ({
    subject: 'Security Alert - Dire Dawa Real Estate Management system',
    html: `
      <h2 style="color: #d32f2f;">Security Alert</h2>
      <p>Hello ${name},</p>
      <p>We detected unusual activity on your account:</p>
      <p style="background-color: #fffde7; padding: 10px; border-left: 4px solid #fbc02d;">${activity}</p>
      <p>If this was not you, please change your password immediately.</p>
    `
  }),
  newMessage: (name, senderName) => ({
    subject: 'You have a new message on Dire Dawa Real Estate Management system',
    html: `
      <h2>New Message</h2>
      <p>Hello ${name},</p>
      <p>You have received a new message from <strong>${senderName}</strong>.</p>
      <p>Log in to your dashboard to read and reply.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="http://localhost:3000/messages" style="background-color: #0d47a1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Message</a>
      </div>
    `
  }),
  bookingInvitation: (name, propertyTitle, tempPassword, email) => ({
    subject: 'Property Booking & Invitation - Dire Dawa Real Estate Management system',
    html: `
      <h2>Hello ${name},</h2>
      <p>A property has been reserved for you: <strong>${propertyTitle}</strong>.</p>
      <p>We have created a temporary account for you. Your login credentials are below:</p>
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #ddd;">
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
      </div>
      <p style="color: #d32f2f; font-weight: bold;">⚠️ Account Status: Pending Activation</p>
      <p>Our administrator is currently reviewing your reservation. Your account will be activated shortly. Once activated, you can log in to complete your profile and finalize the agreement.</p>
      <p><strong>Hold Duration:</strong> This property is held for you for <strong>30 minutes</strong>. Please ensure you are ready to proceed once your account is activated.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="http://localhost:3000/login" style="background-color: #0d47a1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Login Page</a>
      </div>
    `
  }),
  bookingConfirmation: (name, propertyTitle, bookingId) => ({
    subject: 'Booking Confirmation - Dire Dawa Real Estate Management system',
    html: `
      <h2>Hello ${name},</h2>
      <p>Your booking for <strong>${propertyTitle}</strong> has been successfully placed.</p>
      <p><strong>Booking ID:</strong> ${bookingId}</p>
      <p>The property is now on hold for 30 minutes. You can view your booking status in your dashboard.</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="http://localhost:3000/my-bookings" style="background-color: #0d47a1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">View My Bookings</a>
      </div>
    `
  }),
  ownerInvitation: (name, propertyTitle, tempPassword, email) => ({
    subject: `Invitation to Manage Your Property: ${propertyTitle} - Dire Dawa Real Estate`,
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🏠</span>
      </div>
      <h2>Hello ${name},</h2>
      <p>A professional broker has added your property <strong>"${propertyTitle}"</strong> to the Dire Dawa Real Estate Management system.</p>
      <p>We have created a secure account for you so you can track potential buyers, review agreements, and manage your property details directly.</p>
      <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
        <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Your secure login credentials:</p>
        <p style="margin: 5px 0;"><strong>📧 Login Email:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>🔑 Temp Password:</strong> <span style="font-family: monospace; background: #e0e7ff; padding: 2px 6px; borderRadius: 4px;">${tempPassword}</span></p>
      </div>
      <p style="color: #ef4444; font-weight: 600;">⚠️ Action Required: Please log in and change your password to secure your account.</p>
      <div style="text-align: center; margin-top: 35px; margin-bottom: 20px;">
        <a href="http://localhost:3000/login" style="background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); color: white; padding: 16px 35px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(26,35,126,0.25);">Access Your Property Manager</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If you didn't expect this invitation, please contact our support team.</p>
    `
  }),
  accountLockout: (name, minutes) => ({
    subject: '⚠️ Multiple Failed Login Attempts - DDREMS',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🔒</span>
      </div>
      <h2 style="color: #f59e0b;">Account Temporarily Locked</h2>
      <p>Hello ${name},</p>
      <p>We detected <strong>3 failed login attempts</strong> on your account. For your security, your account has been temporarily locked for <strong>${minutes} minute(s)</strong>.</p>
      <p>If this was you, please wait and try again with the correct password.</p>
      <p style="color: #dc2626; font-weight: bold;">If this was NOT you, someone may be trying to access your account. Please change your password immediately after logging in.</p>
      <p style="font-size: 12px; color: #999;">Time: ${new Date().toLocaleString()}</p>
    `
  }),
  accountSuspicious: (name) => ({
    subject: '🚨 URGENT: Your Account Has Been Flagged - DDREMS',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🚨</span>
      </div>
      <h2 style="color: #dc2626;">Account Flagged as Suspicious</h2>
      <p>Hello ${name},</p>
      <p>Your account has been flagged as <strong>suspicious</strong> due to <strong>6 consecutive failed login attempts</strong>.</p>
      <p>Our security team has been notified and is reviewing your account activity.</p>
      <p>If this was you, please contact our support team to verify your identity and regain access.</p>
      <p style="background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626; color: #991b1b;">
        ⚠️ <strong>Warning:</strong> Any further failed login attempts will result in your account being permanently banned.
      </p>
      <p style="font-size: 12px; color: #999;">Time: ${new Date().toLocaleString()}</p>
    `
  }),
  accountBanned: (name) => ({
    subject: '🛑 Account Banned - Dire Dawa Real Estate Management System',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🛑</span>
      </div>
      <h2 style="color: #dc2626;">Account Permanently Banned</h2>
      <p>Hello ${name},</p>
      <p>Your account has been <strong>permanently banned</strong> due to repeated failed login attempts (9+ consecutive failures), indicating a potential unauthorized access attempt.</p>
      <div style="background: #fef2f2; padding: 16px; border-radius: 10px; border: 1px solid #fecaca; margin: 20px 0;">
        <p style="margin: 0; color: #991b1b; font-weight: bold;">What does this mean?</p>
        <ul style="color: #991b1b; margin: 8px 0;">
          <li>You will no longer be able to log in to your account</li>
          <li>All active sessions have been terminated</li>
          <li>Our security team has been notified</li>
        </ul>
      </div>
      <p>If you believe this was a mistake and you are the legitimate account owner, please contact our system administrator to request an account review.</p>
      <p style="font-size: 12px; color: #999;">Time: ${new Date().toLocaleString()}</p>
    `
  }),
  adminSuspiciousAlert: (adminName, userName, userEmail, attemptCount) => ({
    subject: '🚨 SECURITY ALERT: Suspicious Account Detected - DDREMS',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🚨</span>
      </div>
      <h2 style="color: #dc2626;">Suspicious Account Alert</h2>
      <p>Hello ${adminName},</p>
      <p>A user account has been flagged as <strong>suspicious</strong> due to multiple failed login attempts:</p>
      <div style="background: #fffbeb; padding: 16px; border-radius: 10px; border: 1px solid #fde68a; margin: 20px 0;">
        <p><strong>👤 User:</strong> ${userName}</p>
        <p><strong>📧 Email:</strong> ${userEmail}</p>
        <p><strong>🔢 Failed Attempts:</strong> ${attemptCount}</p>
        <p><strong>⏰ Time:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>Please review this account in the System Admin dashboard under <strong>Suspicious Accounts</strong>.</p>
    `
  }),
  adminBannedAlert: (adminName, userName, userEmail, attemptCount) => ({
    subject: '🛑 SECURITY ALERT: Account Auto-Banned - DDREMS',
    html: `
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="font-size: 50px;">🛑</span>
      </div>
      <h2 style="color: #dc2626;">Account Auto-Banned</h2>
      <p>Hello ${adminName},</p>
      <p>A user account has been <strong>automatically banned</strong> due to excessive failed login attempts:</p>
      <div style="background: #fef2f2; padding: 16px; border-radius: 10px; border: 1px solid #fecaca; margin: 20px 0;">
        <p><strong>👤 User:</strong> ${userName}</p>
        <p><strong>📧 Email:</strong> ${userEmail}</p>
        <p><strong>🔢 Failed Attempts:</strong> ${attemptCount}</p>
        <p><strong>⏰ Banned At:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>You can review and unban this account from the System Admin dashboard if needed.</p>
    `
  })
};

module.exports = {
  sendEmail,
  templates
};
