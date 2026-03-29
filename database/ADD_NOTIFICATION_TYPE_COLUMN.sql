-- ============================================================================
-- FIX: Add missing notification_type column to notifications table
-- ============================================================================

USE ddrems;

-- Add the notification_type column if it doesn't exist
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type VARCHAR(50) AFTER type;

-- Verify the column was added
DESCRIBE notifications;

SELECT '✅ notification_type column added successfully!' as status;
