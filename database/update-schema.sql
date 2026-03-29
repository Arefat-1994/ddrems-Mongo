-- Add announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample announcements
INSERT INTO announcements (title, content, priority, created_by) VALUES
('System Maintenance Scheduled', 'Scheduled maintenance on March 1st from 2:00 AM to 4:00 AM', 'high', 1),
('New Feature: 3D Property Tours', 'We have added support for 3D virtual property tours', 'normal', 1),
('Welcome to DDREMS', 'Welcome to Dire Dawa Real Estate Management System', 'normal', 1);

-- Add images column to properties if not exists
ALTER TABLE properties ADD COLUMN IF NOT EXISTS images TEXT AFTER area;

-- Add profile_image to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) AFTER phone;

-- Add profile_image to brokers
ALTER TABLE brokers ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) AFTER phone;

-- Add address fields to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address VARCHAR(500) AFTER location;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS state VARCHAR(100) AFTER city;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) AFTER state;

-- Add features column to properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS features JSON AFTER images;

-- Update properties with sample features
UPDATE properties SET features = JSON_ARRAY('Parking', 'Garden', 'Security') WHERE type = 'villa';
UPDATE properties SET features = JSON_ARRAY('Elevator', 'Balcony') WHERE type = 'apartment';
UPDATE properties SET features = JSON_ARRAY('Fenced', 'Water Access') WHERE type = 'land';
UPDATE properties SET features = JSON_ARRAY('Parking', 'Security', 'Generator') WHERE type = 'commercial';
