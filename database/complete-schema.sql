-- Complete DDREMS Database Schema for All Actors

-- Add role-specific tables and fields

-- Property listings with owner information
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INT AFTER broker_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_date DATE AFTER created_at;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expiry_date DATE AFTER listing_date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS views INT DEFAULT 0 AFTER verified;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS favorites INT DEFAULT 0 AFTER views;

-- Agreements table for property agreements
CREATE TABLE IF NOT EXISTS agreements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  owner_id INT NOT NULL,
  buyer_id INT,
  agreement_type ENUM('sale', 'rent', 'lease') NOT NULL,
  agreement_document VARCHAR(500),
  start_date DATE,
  end_date DATE,
  amount DECIMAL(15,2) NOT NULL,
  status ENUM('draft', 'pending', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Favorites/Wishlist table
CREATE TABLE IF NOT EXISTS favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, property_id)
);

-- Property views tracking
CREATE TABLE IF NOT EXISTS property_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT,
  ip_address VARCHAR(45),
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Feedback table
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
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Messages/Communication table
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  property_id INT,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System configuration table
CREATE TABLE IF NOT EXISTS system_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  description VARCHAR(500),
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Audit log table
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
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Payment receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  receipt_number VARCHAR(100) UNIQUE NOT NULL,
  receipt_document VARCHAR(500),
  issued_date DATE NOT NULL,
  issued_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Property documents table
CREATE TABLE IF NOT EXISTS property_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  document_type ENUM('title_deed', 'survey_plan', 'tax_clearance', 'building_permit', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_path VARCHAR(500) NOT NULL,
  uploaded_by INT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample data for testing

-- First, modify the users table to add new roles
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user';

-- Insert sample owners

-- Insert sample customers
INSERT INTO users (name, email, password, phone, role, status) VALUES
('Customer 1', 'customer1@ddrems.com', '$2a$10$YourHashedPasswordHere', '+251966345678', 'user', 'active'),
('Customer 2', 'customer2@ddrems.com', '$2a$10$YourHashedPasswordHere', '+251977456789', 'user', 'active');

-- Update properties with owner_id
UPDATE properties SET owner_id = 2 WHERE id = 1;
UPDATE properties SET owner_id = 3 WHERE id = 2;
UPDATE properties SET owner_id = 2 WHERE id = 3;
UPDATE properties SET owner_id = 3 WHERE id = 4;

-- Insert sample agreements
INSERT INTO agreements (property_id, owner_id, buyer_id, agreement_type, amount, status) VALUES
(1, 2, 4, 'sale', 8500000, 'active'),
(2, 3, 5, 'rent', 2500000, 'active');

-- Insert sample favorites
INSERT INTO favorites (user_id, property_id) VALUES
(4, 1), (4, 3), (5, 2), (5, 4);

-- Insert sample feedback
INSERT INTO feedback (user_id, property_id, rating, comment, feedback_type) VALUES
(4, 1, 5, 'Excellent property with great location', 'property'),
(5, 2, 4, 'Good apartment, reasonable price', 'property');

-- Insert sample notifications
INSERT INTO notifications (user_id, title, message, type) VALUES
(2, 'New Property View', 'Your property "Modern Villa in Kezira" has been viewed 5 times today', 'info'),
(4, 'Property Approved', 'Your favorite property is now available for viewing', 'success');

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('site_name', 'DDREMS', 'System name'),
('commission_rate', '2.5', 'Default commission rate percentage'),
('max_property_images', '10', 'Maximum number of images per property'),
('property_expiry_days', '90', 'Days before property listing expires');
