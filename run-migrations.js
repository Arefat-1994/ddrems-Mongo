const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ddrems',
    port: process.env.DB_PORT || 3307
  });

  const migrations = [
    // Ensure phone column in users table
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL AFTER email`,

    // Ensure profile_approved and profile_completed columns
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_approved BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE`,

    // Create customer_profiles if not exists
    `CREATE TABLE IF NOT EXISTS customer_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(255),
      phone_number VARCHAR(20),
      address TEXT,
      profile_photo LONGTEXT,
      id_document LONGTEXT,
      profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      approved_by INT,
      approved_at DATETIME,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Create owner_profiles if not exists
    `CREATE TABLE IF NOT EXISTS owner_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(255),
      phone_number VARCHAR(20),
      address TEXT,
      profile_photo LONGTEXT,
      id_document LONGTEXT,
      business_license LONGTEXT,
      profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      approved_by INT,
      approved_at DATETIME,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Create broker_profiles if not exists
    `CREATE TABLE IF NOT EXISTS broker_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      full_name VARCHAR(255),
      phone_number VARCHAR(20),
      address TEXT,
      profile_photo LONGTEXT,
      id_document LONGTEXT,
      broker_license LONGTEXT,
      license_number VARCHAR(100),
      profile_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      approved_by INT,
      approved_at DATETIME,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Create notifications table if not exists
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255),
      message TEXT,
      type VARCHAR(50) DEFAULT 'info',
      notification_type VARCHAR(50) DEFAULT 'info',
      related_id INT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create agreement_requests if not exists
    `CREATE TABLE IF NOT EXISTS agreement_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      customer_id INT NOT NULL,
      owner_id INT,
      broker_id INT,
      request_message TEXT,
      response_message TEXT,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      responded_by INT,
      responded_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create agreements if not exists
    `CREATE TABLE IF NOT EXISTS agreements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      customer_id INT NOT NULL,
      owner_id INT,
      broker_id INT,
      agreement_text TEXT,
      status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Ensure agreements table columns exist
    `ALTER TABLE agreements ADD COLUMN IF NOT EXISTS customer_id INT AFTER property_id`,
    `ALTER TABLE agreements ADD COLUMN IF NOT EXISTS owner_id INT AFTER customer_id`,
    `ALTER TABLE agreements ADD COLUMN IF NOT EXISTS broker_id INT AFTER owner_id`,
    `ALTER TABLE agreements ADD COLUMN IF NOT EXISTS agreement_text TEXT AFTER broker_id`,
    `ALTER TABLE agreements MODIFY COLUMN status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending'`,

    // Create property_requests if not exists
    `CREATE TABLE IF NOT EXISTS property_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      broker_id INT NOT NULL,
      owner_id INT,
      request_type VARCHAR(50) DEFAULT 'listing',
      request_message TEXT,
      response_message TEXT,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      responded_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create document_access if not exists
    `CREATE TABLE IF NOT EXISTS document_access (
      id INT AUTO_INCREMENT PRIMARY KEY,
      property_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      access_key VARCHAR(255),
      response_message TEXT,
      requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME
    )`,

    // Create messages table if not exists
    `CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      subject VARCHAR(255),
      message TEXT,
      message_type VARCHAR(50) DEFAULT 'general',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Create profile_edit_requests table if not exists
    `CREATE TABLE IF NOT EXISTS profile_edit_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      profile_id INT NOT NULL,
      request_type ENUM('customer', 'owner', 'broker') NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      admin_response TEXT,
      responded_by INT,
      responded_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL
    )`
  ];

  console.log('🔧 Running database migrations...\n');

  for (const sql of migrations) {
    try {
      await connection.query(sql);
      const tableName = sql.match(/(?:TABLE|INTO|ALTER TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
      console.log(`✅ ${tableName ? tableName[1] : 'Migration'} - OK`);
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column')) {
        console.log(`⏭️  Column already exists - skipped`);
      } else {
        console.log(`⚠️  ${error.message.substring(0, 80)}`);
      }
    }
  }

  console.log('\n✅ All migrations complete!');
  await connection.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
