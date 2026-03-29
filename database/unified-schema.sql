-- ============================================================================
-- DDREMS UNIFIED DATABASE SCHEMA
-- Consolidated from all schema files - single source of truth
-- ============================================================================

-- Create database
CREATE DATABASE IF NOT EXISTS ddrems;
USE ddrems;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (base for all actors)
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(255),
  role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  profile_approved BOOLEAN DEFAULT FALSE,
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- Brokers table
CREATE TABLE IF NOT EXISTS brokers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  profile_image VARCHAR(255),
  license_number VARCHAR(100) UNIQUE,
  commission_rate DECIMAL(5,2) DEFAULT 2.5,
  total_sales INT DEFAULT 0,
  total_commission DECIMAL(15,2) DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_license (license_number),
  INDEX idx_status (status)
);

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(15,2) NOT NULL,
  location VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  type ENUM('house', 'apartment', 'land', 'commercial', 'villa') NOT NULL,
  bedrooms INT,
  bathrooms INT,
  area DECIMAL(10,2),
  images TEXT,
  main_image LONGTEXT,
  features JSON,
  status ENUM('active', 'pending', 'sold', 'rented', 'inactive') DEFAULT 'active',
  broker_id INT,
  owner_id INT,
  listing_date DATE,
  expiry_date DATE,
  verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMP NULL,
  views INT DEFAULT 0,
  favorites INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_location (location),
  INDEX idx_verified (verified),
  INDEX idx_broker (broker_id),
  INDEX idx_owner (owner_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  broker_id INT,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type ENUM('sale', 'rent', 'installment') NOT NULL,
  payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'installment') NOT NULL,
  status ENUM('pending', 'completed', 'cancelled', 'failed') DEFAULT 'pending',
  installment_plan JSON,
  commission_amount DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  INDEX idx_property (property_id)
);

-- Payments table (for installments)
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_transaction (transaction_id)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_type VARCHAR(50),
  min_price DECIMAL(15,2),
  max_price DECIMAL(15,2),
  preferred_location VARCHAR(255),
  bedrooms INT,
  bathrooms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preference (user_id)
);

-- Fraud alerts table
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  alert_type VARCHAR(100) NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  description TEXT,
  related_entity_type ENUM('user', 'broker', 'property', 'transaction'),
  related_entity_id INT,
  status ENUM('new', 'investigating', 'resolved', 'false_positive') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_status (status),
  INDEX idx_severity (severity)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  target_role ENUM('all', 'user', 'owner', 'broker', 'admin') DEFAULT 'all',
  author_id INT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_priority (priority),
  INDEX idx_target_role (target_role),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- PROFILE TABLES
-- ============================================================================

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

-- ============================================================================
-- AGREEMENT & REQUEST TABLES
-- ============================================================================

-- Agreements table
CREATE TABLE IF NOT EXISTS agreements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  owner_id INT,
  buyer_id INT,
  broker_id INT,
  agreement_type ENUM('sale', 'rent', 'lease') NOT NULL DEFAULT 'sale',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  status ENUM('draft', 'pending', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  terms TEXT,
  document_key VARCHAR(8),
  document_url LONGTEXT,
  agreement_document VARCHAR(500),
  terms_accepted BOOLEAN DEFAULT FALSE,
  accepted_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_property (property_id),
  INDEX idx_user (user_id)
);

-- Key Requests (for access key requests)
CREATE TABLE IF NOT EXISTS request_key (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  customer_id INT NOT NULL,
  owner_id INT,
  admin_id INT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
  key_code VARCHAR(50),
  request_message TEXT,
  response_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_customer (customer_id),
  INDEX idx_property (property_id),
  INDEX idx_admin (admin_id)
);

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

-- Property Requests (for brokers)
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

-- Broker Requests (incoming agreement requests)
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

-- ============================================================================
-- PROPERTY & DOCUMENT TABLES
-- ============================================================================

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

-- Document Access Requests
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

-- Favorites/Wishlist
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

-- ============================================================================
-- COMMUNICATION TABLES
-- ============================================================================

-- Messages/Communication
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT,
  property_id INT,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'general',
  status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  is_read BOOLEAN DEFAULT FALSE,
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  INDEX idx_receiver (receiver_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created (created_at),
  INDEX idx_is_group (is_group)
);

-- Message Recipients (for group messages)
CREATE TABLE IF NOT EXISTS message_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_message (message_id),
  INDEX idx_user (user_id),
  UNIQUE KEY unique_recipient (message_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error', 'request') DEFAULT 'info',
  notification_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  action_url VARCHAR(255),
  related_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at),
  INDEX idx_is_read (is_read)
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type ENUM('property', 'service', 'broker', 'system') DEFAULT 'system',
  status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_type (feedback_type)
);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

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

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert sample admin user (password: admin123)
INSERT INTO users (name, email, password, role, profile_approved, profile_completed) VALUES 
('System Administrator', 'admin@ddrems.com', '$2a$10$YourHashedPasswordHere', 'admin', TRUE, TRUE);

-- Insert sample brokers
INSERT INTO brokers (name, email, phone, license_number, commission_rate, total_sales, rating) VALUES
('John Doe', 'john@ddrems.com', '+251911234567', 'BRK001', 2.5, 15, 4.5),
('Jane Smith', 'jane@ddrems.com', '+251922345678', 'BRK002', 3.0, 22, 4.8),
('Ahmed Hassan', 'ahmed@ddrems.com', '+251933456789', 'BRK003', 2.5, 8, 4.2);

-- Insert sample properties
INSERT INTO properties (title, description, price, location, type, bedrooms, bathrooms, area, broker_id, verified) VALUES
('Modern Villa in Kezira', 'Beautiful 4-bedroom villa with garden', 8500000, 'Kezira, Dire Dawa', 'villa', 4, 3, 350.00, 1, TRUE),
('Downtown Apartment', 'Spacious 2-bedroom apartment near city center', 2500000, 'Downtown, Dire Dawa', 'apartment', 2, 1, 120.00, 2, TRUE),
('Commercial Building', 'Prime location commercial property', 15000000, 'Sabian, Dire Dawa', 'commercial', 0, 2, 500.00, 1, TRUE),
('Residential Land', '500 sqm residential plot', 1200000, 'Legehare, Dire Dawa', 'land', 0, 0, 500.00, 3, FALSE);

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('site_name', 'DDREMS', 'System name'),
('commission_rate', '2.5', 'Default commission rate percentage'),
('max_property_images', '10', 'Maximum number of images per property'),
('property_expiry_days', '90', 'Days before property listing expires');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update property views count
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

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for customer profiles with user info
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

-- View for owner profiles with user info
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

-- View for broker profiles with user info
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

-- View for agreement requests with full details
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

-- ============================================================================
-- COMPLETION
-- ============================================================================

SELECT '✅ DDREMS Unified Database Schema Created Successfully!' as status;
