-- ============================================================
-- DDREMS Fix Schema Migration
-- Fixes: missing tables, missing columns, enum updates
-- Safe to run multiple times (uses IF NOT EXISTS / IF NOT EXISTS patterns)
-- ============================================================

-- 1. Add missing columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_id INT AFTER broker_id;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_type VARCHAR(20) DEFAULT 'sale' AFTER type;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_date DATE AFTER created_at;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS expiry_date DATE AFTER listing_date;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS views INT DEFAULT 0 AFTER verified;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS favorites INT DEFAULT 0 AFTER views;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address VARCHAR(500) AFTER location;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state VARCHAR(100) AFTER city;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) AFTER state;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS features JSON AFTER images;

-- 2. Update properties.status ENUM to include 'suspended'
ALTER TABLE properties MODIFY COLUMN status ENUM('active', 'pending', 'sold', 'rented', 'inactive', 'suspended') DEFAULT 'active';

-- 3. Create property_images table with LONGTEXT for base64 image storage
CREATE TABLE IF NOT EXISTS property_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  image_url LONGTEXT NOT NULL,
  image_type ENUM('main', 'gallery', 'document') DEFAULT 'gallery',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. If property_images already exists with VARCHAR, alter image_url to LONGTEXT
-- (Safe: LONGTEXT can hold anything VARCHAR had)
ALTER TABLE property_images MODIFY COLUMN image_url LONGTEXT NOT NULL;

-- 5. Create property_verification table
CREATE TABLE IF NOT EXISTS property_verification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  verified_by INT,
  verification_status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  verification_notes TEXT,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 6. Create property_documents table (enhanced version)
CREATE TABLE IF NOT EXISTS property_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url LONGTEXT NOT NULL,
  document_type VARCHAR(100),
  access_key VARCHAR(50),
  is_locked BOOLEAN DEFAULT 0,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. Create document_access_requests table
CREATE TABLE IF NOT EXISTS document_access_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  access_key VARCHAR(50),
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Update user roles ENUM to include all roles
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'broker', 'user', 'owner', 'property_admin', 'system_admin') DEFAULT 'user';

-- 9. Insert verification records for any existing pending properties that don't have one
INSERT INTO property_verification (property_id, verification_status)
SELECT p.id, 'pending'
FROM properties p
LEFT JOIN property_verification pv ON p.id = pv.property_id
WHERE pv.id IS NULL AND p.status = 'pending';

-- Also insert 'approved' records for existing active/verified properties
INSERT INTO property_verification (property_id, verification_status, verified_at)
SELECT p.id, 'approved', p.verification_date
FROM properties p
LEFT JOIN property_verification pv ON p.id = pv.property_id
WHERE pv.id IS NULL AND p.verified = TRUE;
-- 10. Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'low',
    target_role ENUM('all', 'user', 'broker', 'owner') DEFAULT 'all',
    created_by INT,
    author_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    property_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 12. Create property_views table
CREATE TABLE IF NOT EXISTS property_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    property_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- 13. Create/Update agreements table
CREATE TABLE IF NOT EXISTS agreements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    owner_id INT NOT NULL,
    customer_id INT NOT NULL,
    status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
    agreement_text TEXT,
    agreement_type VARCHAR(50),
    amount DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Support message replies
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parent_id INT DEFAULT NULL;
ALTER TABLE messages ADD CONSTRAINT fk_messages_parent FOREIGN KEY IF NOT EXISTS (parent_id) REFERENCES messages(id) ON DELETE SET NULL;
