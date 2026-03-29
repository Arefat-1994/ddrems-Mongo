-- ============================================================================
-- COMPLETE DATABASE MIGRATION FOR DDREMS
-- This script adds all missing tables and fixes existing ones
-- ============================================================================

USE ddrems;

-- ============================================================================
-- ADD MISSING CORE TABLES
-- ============================================================================

-- Messages table
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
  updated_at TIMESTAMP NULL,
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

-- Notifications table - FIXED VERSION
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
-- ADD MISSING PROFILE TABLES
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
-- ADD MISSING REQUEST TABLES
-- ============================================================================

-- Key Requests
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

-- ============================================================================
-- ADD MISSING PROPERTY TABLES
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
-- ADD MISSING SYSTEM TABLES
-- ============================================================================

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

-- ============================================================================
-- FIX EXISTING TABLES
-- ============================================================================

-- Add missing columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255),
ADD COLUMN IF NOT EXISTS profile_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add missing columns to properties table if they don't exist
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS owner_id INT,
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(50) DEFAULT 'sale',
ADD COLUMN IF NOT EXISTS listing_date DATE,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS main_image LONGTEXT,
ADD COLUMN IF NOT EXISTS features JSON,
ADD COLUMN IF NOT EXISTS address VARCHAR(500),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS favorites INT DEFAULT 0;

-- Add foreign key for owner_id if it doesn't exist
ALTER TABLE properties 
ADD CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- VERIFY TABLES
-- ============================================================================

SELECT '✅ Database migration completed successfully!' as status;
SELECT 'Tables created/updated:' as info;
SHOW TABLES;
