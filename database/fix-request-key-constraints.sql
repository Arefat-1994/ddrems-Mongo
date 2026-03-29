-- Fix request_key table with proper FOREIGN KEY constraints
-- This script adds missing constraints and indexes

-- First, check if constraints already exist and drop them if needed
ALTER TABLE request_key DROP FOREIGN KEY IF EXISTS request_key_ibfk_3;
ALTER TABLE request_key DROP FOREIGN KEY IF EXISTS request_key_ibfk_4;

-- Add FOREIGN KEY constraints for owner_id and admin_id
ALTER TABLE request_key 
ADD CONSTRAINT request_key_ibfk_3 FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
ADD CONSTRAINT request_key_ibfk_4 FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes if they don't exist
ALTER TABLE request_key ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE request_key ADD INDEX IF NOT EXISTS idx_customer (customer_id);
ALTER TABLE request_key ADD INDEX IF NOT EXISTS idx_property (property_id);
ALTER TABLE request_key ADD INDEX IF NOT EXISTS idx_admin (admin_id);

-- Verify the table structure
DESCRIBE request_key;

-- Show FOREIGN KEY constraints
SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'request_key' AND TABLE_SCHEMA = DATABASE();
