-- ═══════════════════════════════════════════════════════════════
-- COMPLETE FIX FOR ALL DDREMS ISSUES
-- This script fixes ALL identified problems in the system
-- ═══════════════════════════════════════════════════════════════

USE ddrems;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 1: Add main_image column to properties table
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding main_image column to properties table...' as status;

-- Check if column exists, if not add it
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ddrems' 
  AND TABLE_NAME = 'properties' 
  AND COLUMN_NAME = 'main_image';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE properties ADD COLUMN main_image LONGTEXT NULL AFTER location',
  'SELECT "main_image column already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ main_image column ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 2: Ensure property_views table exists
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Checking property_views table...' as status;

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

SELECT '✅ property_views table ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 3: Ensure document_access table exists
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Checking document_access table...' as status;

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

SELECT '✅ document_access table ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 4: Ensure agreements table has correct structure
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Checking agreements table...' as status;

CREATE TABLE IF NOT EXISTS agreements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  property_id INT NOT NULL,
  user_id INT NOT NULL,
  broker_id INT NULL,
  agreement_type ENUM('sale', 'rent', 'lease') NOT NULL DEFAULT 'sale',
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
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

SELECT '✅ agreements table ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 5: Add views column to properties if missing
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Adding views column to properties table...' as status;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ddrems' 
  AND TABLE_NAME = 'properties' 
  AND COLUMN_NAME = 'views';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE properties ADD COLUMN views INT DEFAULT 0 AFTER verified',
  'SELECT "views column already exists" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✅ views column ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 6: Update existing properties with main images
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Updating properties with main images...' as status;

-- First, try to use images marked as 'main'
UPDATE properties p
LEFT JOIN property_images pi ON p.id = pi.property_id AND pi.image_type = 'main'
SET p.main_image = pi.image_url
WHERE pi.image_url IS NOT NULL AND (p.main_image IS NULL OR p.main_image = '');

-- For properties without main image, use first available image
UPDATE properties p
LEFT JOIN (
  SELECT property_id, MIN(id) as first_id
  FROM property_images
  GROUP BY property_id
) first_img ON p.id = first_img.property_id
LEFT JOIN property_images pi ON pi.id = first_img.first_id
SET p.main_image = pi.image_url
WHERE (p.main_image IS NULL OR p.main_image = '') AND pi.image_url IS NOT NULL;

SELECT '✅ Properties updated with main images' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 7: Create/Update trigger for property views
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Creating trigger for property views...' as status;

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

SELECT '✅ Trigger created' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 8: Update existing view counts
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Updating existing view counts...' as status;

UPDATE properties p
SET views = (
  SELECT COUNT(*) 
  FROM property_views pv 
  WHERE pv.property_id = p.id
)
WHERE EXISTS (SELECT 1 FROM property_views WHERE property_id = p.id);

SELECT '✅ View counts updated' as status;

-- ═══════════════════════════════════════════════════════════════
-- ISSUE 9: Ensure property_verification table exists
-- ═══════════════════════════════════════════════════════════════

SELECT '🔧 Checking property_verification table...' as status;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT '✅ property_verification table ready' as status;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION: Check all tables exist
-- ═══════════════════════════════════════════════════════════════

SELECT '📊 Verification Summary:' as status;
SELECT '═══════════════════════════════════════════════════════════════' as separator;

SELECT 
  CASE 
    WHEN COUNT(*) >= 14 THEN '✅ All required tables exist'
    ELSE CONCAT('⚠️  Only ', COUNT(*), ' tables found (expected 14+)')
  END as table_status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'ddrems' 
  AND TABLE_NAME IN (
    'users', 'properties', 'property_images', 'property_documents',
    'brokers', 'transactions', 'announcements', 'agreements',
    'favorites', 'notifications', 'messages', 'document_access',
    'property_views', 'property_verification'
  );

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ main_image column exists in properties')
    ELSE '❌ main_image column missing'
  END as main_image_status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ddrems' 
  AND TABLE_NAME = 'properties' 
  AND COLUMN_NAME = 'main_image';

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ views column exists in properties')
    ELSE '❌ views column missing'
  END as views_status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'ddrems' 
  AND TABLE_NAME = 'properties' 
  AND COLUMN_NAME = 'views';

SELECT '═══════════════════════════════════════════════════════════════' as separator;
SELECT '✅ ALL DATABASE FIXES APPLIED SUCCESSFULLY!' as final_status;
SELECT '═══════════════════════════════════════════════════════════════' as separator;
