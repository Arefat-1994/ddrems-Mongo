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
  })
};

module.exports = {
  sendEmail,
  templates
};
