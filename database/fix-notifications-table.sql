-- Fix notifications table to ensure notification_type column exists and is properly sized
USE ddrems;

-- Check if notification_type column exists, if not add it
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) AFTER type;

-- Ensure the column is VARCHAR(50) and not ENUM
-- First, check current definition and modify if needed
ALTER TABLE notifications 
MODIFY COLUMN notification_type VARCHAR(50) NULL;

-- Update any existing records with NULL notification_type to 'msg'
UPDATE notifications 
SET notification_type = 'msg' 
WHERE notification_type IS NULL OR notification_type = '';

-- Verify the table structure
DESCRIBE notifications;

SELECT '✅ Notifications table fixed successfully!' as status;
