const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

// Get 2FA settings for user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[2FA] GET /:userId - userId: ${userId}`);
    
    const [settings] = await db.query(
      'SELECT * FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      const defaultSettings = {
        userId: parseInt(userId),
        twoFactorEnabled: false,
        twoFactorMethod: 'otp',
        otpVerified: false,
        captchaEnabled: true,
        captchaDifficulty: 'medium',
        failedAttempts: 0
      };
      console.log(`[2FA] No settings found for user ${userId}, returning defaults`);
      return res.json(defaultSettings);
    }
    
    console.log(`[2FA] Settings found for user ${userId}`);
    res.json(settings[0]);
  } catch (error) {
    console.error(`[2FA] Error fetching settings for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Setup OTP 2FA
router.post('/:userId/setup-otp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { otpSecret } = req.body;
    
    if (!userId || !otpSecret) {
      return res.status(400).json({ message: 'User ID and OTP secret are required' });
    }
    
    console.log(`[2FA] POST /:userId/setup-otp - userId: ${userId}`);
    
    // Check if settings exist
    const [existing] = await db.query(
      'SELECT id FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      // Create new 2FA settings
      await db.query(
        `INSERT INTO user_two_factor_settings (
          user_id, two_factor_enabled, two_factor_method, otp_secret, otp_verified
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, false, 'otp', otpSecret, false]
      );
    } else {
      // Update existing settings
      await db.query(
        `UPDATE user_two_factor_settings SET 
          otp_secret = ?, two_factor_method = 'otp', otp_verified = false
          WHERE user_id = ?`,
        [otpSecret, userId]
      );
    }
    
    console.log(`[2FA] OTP setup initiated for user ${userId}`);
    res.json({ message: 'OTP setup initiated', otpSecret });
  } catch (error) {
    console.error(`[2FA] Error setting up OTP for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/:userId/verify-otp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { otpCode, generatedOTP } = req.body;
    
    if (!userId || !otpCode) {
      return res.status(400).json({ message: 'User ID and OTP code are required' });
    }
    
    console.log(`[2FA] POST /:userId/verify-otp - userId: ${userId}`);
    
    // Simple OTP verification (in production, use proper TOTP library)
    const isValid = otpCode === generatedOTP;
    
    if (isValid) {
      // Update 2FA settings to enabled
      await db.query(
        `UPDATE user_two_factor_settings SET 
          two_factor_enabled = true, otp_verified = true, updated_at = NOW()
          WHERE user_id = ?`,
        [userId]
      );
      
      // Log verification
      await db.query(
        `INSERT INTO otp_verification_log (user_id, otp_code, is_valid, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, otpCode, true]
      );
      
      console.log(`[2FA] OTP verified successfully for user ${userId}`);
      res.json({ valid: true, message: 'OTP verified successfully' });
    } else {
      // Log failed verification
      await db.query(
        `INSERT INTO otp_verification_log (user_id, otp_code, is_valid, created_at)
         VALUES (?, ?, ?, NOW())`,
        [userId, otpCode, false]
      );
      
      // Increment failed attempts
      await db.query(
        `UPDATE user_two_factor_settings SET failed_attempts = failed_attempts + 1
         WHERE user_id = ?`,
        [userId]
      );
      
      console.log(`[2FA] OTP verification failed for user ${userId}`);
      res.status(400).json({ valid: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error(`[2FA] Error verifying OTP for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Setup Password-based 2FA
router.post('/:userId/setup-password-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    const { securityPassword } = req.body;
    
    if (!userId || !securityPassword) {
      return res.status(400).json({ message: 'User ID and security password are required' });
    }
    
    if (securityPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    console.log(`[2FA] POST /:userId/setup-password-2fa - userId: ${userId}`);
    
    // Hash the password
    const hashedPassword = crypto
      .createHash('sha256')
      .update(securityPassword)
      .digest('hex');
    
    // Check if settings exist
    const [existing] = await db.query(
      'SELECT id FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      // Create new 2FA settings
      await db.query(
        `INSERT INTO user_two_factor_settings (
          user_id, two_factor_enabled, two_factor_method, security_password, security_password_verified
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, true, 'password', hashedPassword, true]
      );
    } else {
      // Update existing settings
      await db.query(
        `UPDATE user_two_factor_settings SET 
          two_factor_enabled = true, two_factor_method = 'password', 
          security_password = ?, security_password_verified = true, updated_at = NOW()
          WHERE user_id = ?`,
        [hashedPassword, userId]
      );
    }
    
    console.log(`[2FA] Password 2FA setup completed for user ${userId}`);
    res.json({ message: 'Password 2FA setup completed' });
  } catch (error) {
    console.error(`[2FA] Error setting up password 2FA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify Password 2FA
router.post('/:userId/verify-password-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    const { securityPassword } = req.body;
    
    if (!userId || !securityPassword) {
      return res.status(400).json({ message: 'User ID and security password are required' });
    }
    
    console.log(`[2FA] POST /:userId/verify-password-2fa - userId: ${userId}`);
    
    // Get stored password hash
    const [settings] = await db.query(
      'SELECT security_password, failed_attempts FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      return res.status(404).json({ message: '2FA settings not found' });
    }
    
    // Check if account is locked
    if (settings[0].failed_attempts >= 5) {
      return res.status(429).json({ message: 'Too many failed attempts. Account locked.' });
    }
    
    // Hash provided password and compare
    const hashedPassword = crypto
      .createHash('sha256')
      .update(securityPassword)
      .digest('hex');
    
    const isValid = hashedPassword === settings[0].security_password;
    
    if (isValid) {
      // Reset failed attempts
      await db.query(
        `UPDATE user_two_factor_settings SET failed_attempts = 0, last_2fa_verification = NOW()
         WHERE user_id = ?`,
        [userId]
      );
      
      console.log(`[2FA] Password verified successfully for user ${userId}`);
      res.json({ valid: true, message: 'Password verified successfully' });
    } else {
      // Increment failed attempts
      await db.query(
        `UPDATE user_two_factor_settings SET failed_attempts = failed_attempts + 1
         WHERE user_id = ?`,
        [userId]
      );
      
      console.log(`[2FA] Password verification failed for user ${userId}`);
      res.status(400).json({ valid: false, message: 'Invalid password' });
    }
  } catch (error) {
    console.error(`[2FA] Error verifying password 2FA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Disable 2FA
router.post('/:userId/disable-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[2FA] POST /:userId/disable-2fa - userId: ${userId}`);
    
    await db.query(
      `UPDATE user_two_factor_settings SET 
        two_factor_enabled = false, otp_verified = false, 
        security_password_verified = false, failed_attempts = 0, updated_at = NOW()
        WHERE user_id = ?`,
      [userId]
    );
    
    console.log(`[2FA] 2FA disabled for user ${userId}`);
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error(`[2FA] Error disabling 2FA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Generate CAPTCHA challenge
router.post('/:userId/generate-captcha', async (req, res) => {
  try {
    const { userId } = req.params;
    const { difficulty } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[2FA] POST /:userId/generate-captcha - userId: ${userId}`);
    
    // Generate random CAPTCHA challenge
    const challengeTypes = ['text', 'math'];
    const challengeType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
    
    let challengeData, solution;
    
    if (challengeType === 'text') {
      // Generate random text challenge
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      solution = '';
      for (let i = 0; i < 6; i++) {
        solution += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      challengeData = { text: solution, display: solution.split('').join(' ') };
    } else {
      // Generate math challenge
      const num1 = Math.floor(Math.random() * 100);
      const num2 = Math.floor(Math.random() * 100);
      solution = (num1 + num2).toString();
      challengeData = { question: `${num1} + ${num2} = ?` };
    }
    
    // Hash solution
    const solutionHash = crypto
      .createHash('sha256')
      .update(solution)
      .digest('hex');
    
    // Store challenge
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const [result] = await db.query(
      `INSERT INTO captcha_challenges (
        user_id, challenge_type, challenge_data, solution_hash, expires_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [userId, challengeType, JSON.stringify(challengeData), solutionHash, expiresAt]
    );
    
    console.log(`[2FA] CAPTCHA generated for user ${userId}`);
    res.json({
      challengeId: result.insertId,
      challengeType,
      challengeData,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error(`[2FA] Error generating CAPTCHA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify CAPTCHA
router.post('/:userId/verify-captcha', async (req, res) => {
  try {
    const { userId } = req.params;
    const { challengeId, answer } = req.body;
    
    if (!userId || !challengeId || !answer) {
      return res.status(400).json({ message: 'User ID, challenge ID, and answer are required' });
    }
    
    console.log(`[2FA] POST /:userId/verify-captcha - userId: ${userId}`);
    
    // Get challenge
    const [challenges] = await db.query(
      'SELECT * FROM captcha_challenges WHERE id = ? AND user_id = ?',
      [challengeId, userId]
    );
    
    if (challenges.length === 0) {
      return res.status(404).json({ message: 'Challenge not found' });
    }
    
    const challenge = challenges[0];
    
    // Check if expired
    if (new Date() > new Date(challenge.expires_at)) {
      return res.status(400).json({ message: 'Challenge expired' });
    }
    
    // Check if already solved
    if (challenge.is_solved) {
      return res.status(400).json({ message: 'Challenge already solved' });
    }
    
    // Hash answer and compare
    const answerHash = crypto
      .createHash('sha256')
      .update(answer.toString().trim())
      .digest('hex');
    
    const isValid = answerHash === challenge.solution_hash;
    
    if (isValid) {
      // Mark as solved
      await db.query(
        'UPDATE captcha_challenges SET is_solved = true WHERE id = ?',
        [challengeId]
      );
      
      console.log(`[2FA] CAPTCHA verified successfully for user ${userId}`);
      res.json({ valid: true, message: 'CAPTCHA verified successfully' });
    } else {
      // Increment attempts
      await db.query(
        'UPDATE captcha_challenges SET attempts = attempts + 1 WHERE id = ?',
        [challengeId]
      );
      
      console.log(`[2FA] CAPTCHA verification failed for user ${userId}`);
      res.status(400).json({ valid: false, message: 'Invalid answer' });
    }
  } catch (error) {
    console.error(`[2FA] Error verifying CAPTCHA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
