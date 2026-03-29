-- Fix Image Upload Issues for Owner Dashboard
USE ddrems;

-- 1. Ensure property_images table has correct structure
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

-- 2. Ensure image_url is LONGTEXT (can store base64 images)
ALTER TABLE property_images MODIFY COLUMN image_url LONGTEXT NOT NULL;

-- 3. Add main_image column to properties table if it doesn't exist
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS main_image LONGTEXT NULL;

-- 4. Create or replace trigger to auto-update main_image in properties table
DROP TRIGGER IF EXISTS update_property_main_image;

DELIMITER $$
CREATE TRIGGER update_property_main_image
AFTER INSERT ON property_images
FOR EACH ROW
BEGIN
  -- If this is a main image, update the properties table
  IF NEW.image_type = 'main' THEN
    UPDATE properties 
    SET main_image = NEW.image_url 
    WHERE id = NEW.property_id;
  END IF;
  
  -- If no main image exists yet, use the first image as main
  IF NOT EXISTS (
    SELECT 1 FROM property_images 
    WHERE property_id = NEW.property_id AND image_type = 'main' AND id < NEW.id
  ) THEN
    UPDATE properties 
    SET main_image = NEW.image_url 
    WHERE id = NEW.property_id AND (main_image IS NULL OR main_image = '');
  END IF;
END$$
DELIMITER ;

-- 5. Update existing properties with their main images
UPDATE properties p
LEFT JOIN property_images pi ON p.id = pi.property_id AND pi.image_type = 'main'
SET p.main_image = pi.image_url
WHERE pi.image_url IS NOT NULL;

-- 6. For properties without a main image, use the first available image
UPDATE properties p
LEFT JOIN (
  SELECT property_id, MIN(id) as first_image_id
  FROM property_images
  GROUP BY property_id
) first_img ON p.id = first_img.property_id
LEFT JOIN property_images pi ON pi.id = first_img.first_image_id
SET p.main_image = pi.image_url
WHERE (p.main_image IS NULL OR p.main_image = '') AND pi.image_url IS NOT NULL;

SELECT 'Image upload fix completed successfully!' as status;
