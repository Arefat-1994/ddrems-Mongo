-- Comprehensive Database Fix for All Dashboard Improvements
USE ddrems;

-- 1. Ensure document_access table exists with correct structure
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
  INDEX idx_status (status),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Ensure property_views table has correct structure
CREATE TABLE IF NOT EXISTS property_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_user_property (user_id, property_id),
  INDEX idx_viewed_at (viewed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Ensure agreements table exists
CREATE TABLE IF NOT EXISTS agreements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  broker_id INT NULL,
  agreement_type ENUM('sale', 'rent', 'lease') NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status ENUM('pending', 'active', 'completed', 'cancelled') DEFAULT 'pending',
  start_date DATE NULL,
  end_date DATE NULL,
  terms TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_property (property_id),
  INDEX idx_user (user_id),
  INDEX idx_broker (broker_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add views column to properties if not exists
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

-- 5. Create trigger to update property views count
DROP TRIGGER IF EXISTS update_property_views_count;

DELIMITER $$
CREATE TRIGGER update_property_views_count
AFTER INSERT ON property_views
FOR EACH ROW
BEGIN
  UPDATE properties 
  SET views = views + 1 
  WHERE id = NEW.property_id;
END$$
DELIMITER ;

-- 6. Update existing view counts
UPDATE properties p
SET views = (
  SELECT COUNT(*) 
  FROM property_views pv 
  WHERE pv.property_id = p.id
);

-- 7. Ensure favorites table exists
CREATE TABLE IF NOT EXISTS favorites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorite (user_id, property_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Ensure feedback table exists
CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_property (property_id),
  INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Add owner_id to properties if not exists (for owner dashboard)
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS owner_id INT NULL,
ADD FOREIGN KEY IF NOT EXISTS (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- 10. Update existing properties to set owner_id from broker_id where owner_id is null
UPDATE properties 
SET owner_id = broker_id 
WHERE owner_id IS NULL AND broker_id IS NOT NULL;

SELECT 'All dashboard improvements database fix completed successfully!' as status;

-- Verify tables
SELECT 'Verifying tables...' as info;
SELECT TABLE_NAME, TABLE_ROWS 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'ddrems' 
AND TABLE_NAME IN ('document_access', 'property_views', 'agreements', 'favorites', 'feedback', 'property_documents')
ORDER BY TABLE_NAME;
