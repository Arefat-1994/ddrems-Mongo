-- Fix Document Upload Issues for Owner Dashboard
USE ddrems;

-- 1. Drop the old property_documents table if it exists
DROP TABLE IF EXISTS property_documents;

-- 2. Create property_documents table with correct structure
CREATE TABLE property_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url LONGTEXT NOT NULL,
  document_type ENUM('title_deed', 'survey_plan', 'tax_clearance', 'building_permit', 'ownership_certificate', 'other') DEFAULT 'other',
  access_key VARCHAR(20) NOT NULL,
  is_locked BOOLEAN DEFAULT FALSE,
  uploaded_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property_id (property_id),
  INDEX idx_access_key (access_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ensure document_access table exists for access requests
CREATE TABLE IF NOT EXISTS document_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_property_user (property_id, user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Document upload fix completed successfully!' as status;
SELECT 'Table structure:' as info;
DESCRIBE property_documents;
