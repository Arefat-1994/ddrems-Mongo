-- Add missing tables and columns for system improvements

USE ddrems;

-- Add profile_status_history table for audit logging
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

-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Add missing columns to messages table if they don't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Add missing columns to notifications table if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id INT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- Create customer_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS customer_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo VARCHAR(500),
  id_document VARCHAR(500),
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

-- Create owner_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS owner_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo VARCHAR(500),
  id_document VARCHAR(500),
  business_license VARCHAR(500),
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

-- Create broker_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS broker_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  profile_photo VARCHAR(500),
  id_document VARCHAR(500),
  broker_license VARCHAR(500),
  license_number VARCHAR(100),
  profile_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approved_by INT,
  approved_at TIMESTAMP NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (profile_status),
  INDEX idx_user (user_id)
);

-- Create agreement_requests table if it doesn't exist
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
  responded_at TIMESTAMP NULL,
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

-- Create payment_confirmations table for payment workflow
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

-- Add missing columns to agreement_requests if they exist
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payment_receipt_id INT;

-- Create profile_edit_requests table if it doesn't exist
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- Update users table to support new roles
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user';

-- Add status column to messages if it doesn't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent';

-- Create broker_requests table for incoming agreement requests
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

-- Add notification_type column to notifications if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50);

-- Ensure messages table has all required columns
ALTER TABLE messages ADD COLUMN IF NOT EXISTS property_id INT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent';

-- Add foreign key for messages.property_id if it doesn't exist
ALTER TABLE messages ADD CONSTRAINT FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

COMMIT;
