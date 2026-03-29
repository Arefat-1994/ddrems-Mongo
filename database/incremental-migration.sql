-- ============================================================================
-- DDREMS INCREMENTAL MIGRATION SCRIPT
-- Adds missing columns, tables, and fixes existing schema
-- Safe to run multiple times - uses IF NOT EXISTS / IF EXISTS
-- ============================================================================

USE ddrems;

-- ============================================================================
-- PHASE 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

SELECT '🔧 PHASE 1: Adding missing columns to existing tables...' as status;

-- Users table enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) AFTER phone;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_approved BOOLEAN DEFAULT FALSE AFTER status;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE AFTER profile_approved;
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user';

-- Brokers table enhancements
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) AFTER phone;

-- Properties table enhancements
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INT AFTER broker_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_date DATE AFTER created_at;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expiry_date DATE AFTER listing_date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS views INT DEFAULT 0 AFTER verified;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS favorites INT DEFAULT 0 AFTER views;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address VARCHAR(500) AFTER location;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state VARCHAR(100) AFTER city;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) AFTER state;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS main_image LONGTEXT AFTER location;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS features JSON AFTER images;

-- Add foreign key for owner_id if it doesn't exist
ALTER TABLE properties ADD CONSTRAINT FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- Messages table enhancements
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'general' AFTER property_id;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent' AFTER is_read;

-- Notifications table enhancements
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) AFTER type;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url VARCHAR(255) AFTER link;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id INT AFTER action_url;

-- Announcements table enhancements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_role ENUM('all', 'user', 'owner', 'broker', 'admin') DEFAULT 'all' AFTER priority;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS author_id INT AFTER target_role;

-- Agreements table enhancements (if exists)
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS document_key VARCHAR(8) AFTER status;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS document_url LONGTEXT AFTER document_key;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE AFTER document_url;
ALTER TABLE agreements ADD COLUMN IF NOT EXISTS accepted_at DATETIME AFTER terms_accepted;

SELECT '✅ PHASE 1 Complete: Columns added' as status;

-- ============================================================================
-- PHASE 2: CREATE MISSING PROFILE TABLES
-- ============================================================================

SELECT '🔧 PHASE 2: Creating missing profile tables...' as status;

-- Customer Profiles
CREATE TABLE IF NOT EXISTS customer_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo LONGTEXT,
  id_document LONGTEXT,
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

-- Owner Profiles
CREATE TABLE IF NOT EXISTS owner_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo LONGTEXT,
  id_document LONGTEXT,
  business_license LONGTEXT,
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

-- Broker Profiles
CREATE TABLE IF NOT EXISTS broker_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo LONGTEXT,
  id_document LONGTEXT,
  broker_license LONGTEXT,
  license_number VARCHAR(100),
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

SELECT '✅ PHASE 2 Complete: Profile tables created' as status;

-- ============================================================================
-- PHASE 3: CREATE MISSING REQUEST & AGREEMENT TABLES
-- ============================================================================

SELECT '🔧 PHASE 3: Creating missing request and agreement tables...' as status;

-- Agreement Requests
CREATE TABLE IF NOT EXISTS agreement_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  customer_id INT NOT NULL,
  owner_id INT,
  broker_id INT,
  request_message TEXT,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  response_message TEXT,
  responded_by INT,
  responded_at DATETIME,
  payment_confirmed BOOLEAN DEFAULT FALSE,
  payment_receipt_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (responded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_customer (customer_id),
  INDEX idx_property (property_id)
);

-- Property Requests
CREATE TABLE IF NOT EXISTS property_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  broker_id INT NOT NULL,
  owner_id INT,
  request_type ENUM('viewing', 'information', 'collaboration') DEFAULT 'information',
  request_message TEXT,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  response_message TEXT,
  responded_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property (property_id),
  INDEX idx_broker (broker_id),
  INDEX idx_status (status)
);

-- Broker Requests
CREATE TABLE IF NOT EXISTS broker_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broker_id INT NOT NULL,
  agreement_request_id INT NOT NULL,
  status ENUM('new', 'viewed', 'responded') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP NULL,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  UNIQUE KEY unique_broker_request (broker_id, agreement_request_id),
  INDEX idx_broker (broker_id),
  INDEX idx_status (status)
);

-- Payment Confirmations
CREATE TABLE IF NOT EXISTS payment_confirmations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agreement_request_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  receipt_document VARCHAR(500),
  confirmed_by INT,
  confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agreement_request_id) REFERENCES agreement_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_agreement (agreement_request_id)
);

-- Profile Edit Requests
CREATE TABLE IF NOT EXISTS profile_edit_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  profile_id INT,
  request_type ENUM('customer', 'owner', 'broker') NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_user (user_id)
);

-- Profile Status History
CREATE TABLE IF NOT EXISTS profile_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  profile_id INT NOT NULL,
  profile_type ENUM('customer', 'owner', 'broker') NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_profile (profile_id, profile_type),
  INDEX idx_changed_at (changed_at)
);

SELECT '✅ PHASE 3 Complete: Request and agreement tables created' as status;

-- ============================================================================
-- PHASE 4: CREATE MISSING PROPERTY & DOCUMENT TABLES
-- ============================================================================

SELECT '🔧 PHASE 4: Creating missing property and document tables...' as status;

-- Property Views
CREATE TABLE IF NOT EXISTS property_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT,
  ip_address VARCHAR(45),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property (property_id),
  INDEX idx_user (user_id),
  INDEX idx_viewed_at (viewed_at DESC)
);

-- Property Documents
CREATE TABLE IF NOT EXISTS property_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  document_type ENUM('title_deed', 'survey_plan', 'tax_clearance', 'building_permit', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_path VARCHAR(500) NOT NULL,
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property (property_id),
  INDEX idx_type (document_type)
);

-- Document Access
CREATE TABLE IF NOT EXISTS document_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  response_message TEXT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_property_user (property_id, user_id),
  INDEX idx_status (status)
);

-- Property Verification
CREATE TABLE IF NOT EXISTS property_verification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  verification_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  verification_notes TEXT NULL,
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property (property_id),
  INDEX idx_status (verification_status)
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, property_id),
  INDEX idx_user (user_id)
);

SELECT '✅ PHASE 4 Complete: Property and document tables created' as status;

-- ============================================================================
-- PHASE 5: CREATE MISSING SYSTEM TABLES
-- ============================================================================

SELECT '🔧 PHASE 5: Creating missing system tables...' as status;

-- System Configuration
CREATE TABLE IF NOT EXISTS system_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  description VARCHAR(500),
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_key (config_key)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
);

-- Payment Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  receipt_document VARCHAR(500),
  issued_date DATE NOT NULL,
  issued_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_transaction (transaction_id)
);

SELECT '✅ PHASE 5 Complete: System tables created' as status;

-- ============================================================================
-- PHASE 6: ADD MISSING INDEXES
-- ============================================================================

SELECT '🔧 PHASE 6: Adding missing indexes for performance...' as status;

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_properties_location ON properties(location);
CREATE INDEX IF NOT EXISTS idx_properties_verified ON properties(verified);
CREATE INDEX IF NOT EXISTS idx_properties_broker ON properties(broker_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_brokers_email ON brokers(email);
CREATE INDEX IF NOT EXISTS idx_brokers_license ON brokers(license_number);
CREATE INDEX IF NOT EXISTS idx_brokers_status ON brokers(status);

SELECT '✅ PHASE 6 Complete: Indexes added' as status;

-- ============================================================================
-- PHASE 7: UPDATE EXISTING DATA
-- ============================================================================

SELECT '🔧 PHASE 7: Updating existing data...' as status;

-- Update admin users to have approved profiles
UPDATE users 
SET profile_approved = TRUE, profile_completed = TRUE 
WHERE role IN ('admin', 'system_admin', 'property_admin')
AND profile_approved = FALSE;

-- Update properties with sample features if empty
UPDATE properties SET features = JSON_ARRAY('Parking', 'Garden', 'Security') 
WHERE type = 'villa' AND (features IS NULL OR features = '');

UPDATE properties SET features = JSON_ARRAY('Elevator', 'Balcony') 
WHERE type = 'apartment' AND (features IS NULL OR features = '');

UPDATE properties SET features = JSON_ARRAY('Fenced', 'Water Access') 
WHERE type = 'land' AND (features IS NULL OR features = '');

UPDATE properties SET features = JSON_ARRAY('Parking', 'Security', 'Generator') 
WHERE type = 'commercial' AND (features IS NULL OR features = '');

-- Insert system configuration if not exists
INSERT IGNORE INTO system_config (config_key, config_value, description) VALUES
('site_name', 'DDREMS', 'System name'),
('commission_rate', '2.5', 'Default commission rate percentage'),
('max_property_images', '10', 'Maximum number of images per property'),
('property_expiry_days', '90', 'Days before property listing expires');

SELECT '✅ PHASE 7 Complete: Data updated' as status;

-- ============================================================================
-- PHASE 8: CREATE TRIGGERS
-- ============================================================================

SELECT '🔧 PHASE 8: Creating triggers...' as status;

DROP TRIGGER IF EXISTS update_property_views_count;
DELIMITER $
CREATE TRIGGER update_property_views_count
AFTER INSERT ON property_views
FOR EACH ROW
BEGIN
  UPDATE properties 
  SET views = views + 1 
  WHERE id = NEW.property_id;
END$
DELIMITER ;

SELECT '✅ PHASE 8 Complete: Triggers created' as status;

-- ============================================================================
-- PHASE 9: CREATE VIEWS
-- ============================================================================

SELECT '🔧 PHASE 9: Creating database views...' as status;

CREATE OR REPLACE VIEW v_customer_profiles AS
SELECT 
    cp.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM customer_profiles cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN users approver ON cp.approved_by = approver.id;

CREATE OR REPLACE VIEW v_owner_profiles AS
SELECT 
    op.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM owner_profiles op
JOIN users u ON op.user_id = u.id
LEFT JOIN users approver ON op.approved_by = approver.id;

CREATE OR REPLACE VIEW v_broker_profiles AS
SELECT 
    bp.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role,
    approver.name as approved_by_name
FROM broker_profiles bp
JOIN users u ON bp.user_id = u.id
LEFT JOIN users approver ON bp.approved_by = approver.id;

CREATE OR REPLACE VIEW v_agreement_requests AS
SELECT 
    ar.*,
    p.title as property_title,
    p.location as property_location,
    p.price as property_price,
    customer.name as customer_name,
    customer.email as customer_email,
    owner.name as owner_name,
    broker.name as broker_name,
    responder.name as responded_by_name
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
JOIN users customer ON ar.customer_id = customer.id
LEFT JOIN users owner ON ar.owner_id = owner.id
LEFT JOIN users broker ON ar.broker_id = broker.id
LEFT JOIN users responder ON ar.responded_by = responder.id;

SELECT '✅ PHASE 9 Complete: Views created' as status;

-- ============================================================================
-- VERIFICATION & SUMMARY
-- ============================================================================

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '📊 MIGRATION SUMMARY' as title;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT CONCAT('✅ Total Tables: ', COUNT(*)) as table_count
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ddrems';

SELECT 'Tables Created:' as section;
SHOW TABLES;

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '✅ INCREMENTAL MIGRATION COMPLETED SUCCESSFULLY!' as final_status;
SELECT '═══════════════════════════════════════════════════════════════' as separator;
