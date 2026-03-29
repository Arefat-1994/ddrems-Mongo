-- Add image and document columns to properties table
ALTER TABLE properties 
ADD COLUMN images TEXT AFTER description,
ADD COLUMN documents TEXT AFTER images,
ADD COLUMN document_access_key VARCHAR(50) AFTER documents,
ADD COLUMN is_document_locked BOOLEAN DEFAULT 0 AFTER document_access_key;

-- Create property_images table for multiple images
CREATE TABLE IF NOT EXISTS property_images (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  image_type ENUM('main', 'gallery', 'document') DEFAULT 'gallery',
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create property_documents table
CREATE TABLE IF NOT EXISTS property_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  document_type VARCHAR(100),
  access_key VARCHAR(50),
  is_locked BOOLEAN DEFAULT 0,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create document_access_requests table
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

-- Create commission_tracking table
CREATE TABLE IF NOT EXISTS commission_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  broker_id INT NOT NULL,
  property_id INT NOT NULL,
  transaction_id INT,
  commission_amount DECIMAL(15, 2) NOT NULL,
  commission_rate DECIMAL(5, 2),
  status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
  payment_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Enhance agreements table
ALTER TABLE agreements 
ADD COLUMN agreement_document VARCHAR(500) AFTER status,
ADD COLUMN meeting_date DATETIME AFTER agreement_document,
ADD COLUMN meeting_status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending' AFTER meeting_date,
ADD COLUMN notes TEXT AFTER meeting_status;

-- Create feedback_responses table
CREATE TABLE IF NOT EXISTS feedback_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  feedback_id INT NOT NULL,
  responder_id INT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
  FOREIGN KEY (responder_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create property_verification table
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
