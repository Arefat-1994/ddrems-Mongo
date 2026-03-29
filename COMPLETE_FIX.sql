-- COMPLETE FIX FOR ALL DDREMS ISSUES
USE ddrems;

-- 1. Add main_image column to properties if missing
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS main_image LONGTEXT NULL;

-- 2. Ensure property_views table exists with correct structure
CREATE TABLE IF NOT EXISTS property_views (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  property_id INT NOT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_user_property (user_id, property_id),
  INDEX idx_viewed_at (viewed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Ensure document_access table exists
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Ensure agreements table exists
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
  FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Add views column to properties
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

-- 6. Update existing properties with main images
UPDATE properties p
LEFT JOIN property_images pi ON p.id = pi.property_id AND pi.image_type = 'main'
SET p.main_image = pi.image_url
WHERE pi.image_url IS NOT NULL AND (p.main_image IS NULL OR p.main_image = '');

-- 7. For properties without main image, use first available
UPDATE properties p
LEFT JOIN (
  SELECT property_id, MIN(id) as first_id
  FROM property_images
  GROUP BY property_id
) first_img ON p.id = first_img.property_id
LEFT JOIN property_images pi ON pi.id = first_img.first_id
SET p.main_image = pi.image_url
WHERE (p.main_image IS NULL OR p.main_image = '') AND pi.image_url IS NOT NULL;

-- 8. Create trigger for property views
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

-- 9. Update existing view counts
UPDATE properties p
SET views = (
  SELECT COUNT(*) 
  FROM property_views pv 
  WHERE pv.property_id = p.id
)
WHERE EXISTS (SELECT 1 FROM property_views WHERE property_id = p.id);

SELECT '✅ All database fixes applied successfully!' as status;
