-- ============================================================================
-- FINAL FIX FOR NOTIFICATIONS TABLE
-- Remove notification_type column and ensure proper structure
-- ============================================================================

USE ddrems;

-- ============================================================================
-- 1. BACKUP EXISTING NOTIFICATIONS DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications_backup AS
SELECT * FROM notifications;

SELECT 'Backed up existing notifications' as status;

-- ============================================================================
-- 2. DROP AND RECREATE NOTIFICATIONS TABLE
-- ============================================================================

-- Drop the old notifications table
DROP TABLE IF EXISTS notifications;

-- Create the correct notifications table (without notification_type)
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'success', 'warning', 'error', 'request') DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link VARCHAR(500),
  action_url VARCHAR(255),
  related_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at),
  INDEX idx_is_read (is_read)
);

SELECT '✅ Notifications table recreated successfully' as status;

-- ============================================================================
-- 3. RESTORE DATA FROM BACKUP (if any)
-- ============================================================================

INSERT INTO notifications (user_id, title, message, type, is_read, link, action_url, related_id, created_at)
SELECT user_id, title, message, type, is_read, link, action_url, related_id, created_at
FROM notifications_backup
WHERE user_id IS NOT NULL;

SELECT CONCAT('✅ Restored ', COUNT(*), ' notifications from backup') as status
FROM notifications;

-- ============================================================================
-- 4. VERIFY MESSAGES TABLE STRUCTURE
-- ============================================================================

-- Ensure messages table has all required columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'general' AFTER message,
ADD COLUMN IF NOT EXISTS status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent' AFTER message_type,
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE AFTER is_read,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL AFTER is_group;

-- Add indexes if they don't exist
ALTER TABLE messages 
ADD INDEX IF NOT EXISTS idx_receiver (receiver_id),
ADD INDEX IF NOT EXISTS idx_sender (sender_id),
ADD INDEX IF NOT EXISTS idx_created (created_at),
ADD INDEX IF NOT EXISTS idx_is_group (is_group);

SELECT '✅ Messages table verified' as status;

-- ============================================================================
-- 5. VERIFY MESSAGE_RECIPIENTS TABLE STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_recipients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_message (message_id),
  INDEX idx_user (user_id),
  UNIQUE KEY unique_recipient (message_id, user_id)
);

SELECT '✅ Message_recipients table verified' as status;

-- ============================================================================
-- 6. FINAL VERIFICATION
-- ============================================================================

SELECT '✅ FINAL TABLE STRUCTURES:' as info;

SELECT 'NOTIFICATIONS TABLE:' as table_name;
DESCRIBE notifications;

SELECT 'MESSAGES TABLE:' as table_name;
DESCRIBE messages;

SELECT 'MESSAGE_RECIPIENTS TABLE:' as table_name;
DESCRIBE message_recipients;

-- ============================================================================
-- 7. DATA SUMMARY
-- ============================================================================

SELECT '✅ DATA SUMMARY:' as info;

SELECT 
  (SELECT COUNT(*) FROM messages) as total_messages,
  (SELECT COUNT(*) FROM messages WHERE is_group = 0) as individual_messages,
  (SELECT COUNT(*) FROM messages WHERE is_group = 1) as group_messages,
  (SELECT COUNT(*) FROM message_recipients) as total_recipients,
  (SELECT COUNT(*) FROM notifications) as total_notifications;

SELECT '✅ ALL FIXES APPLIED SUCCESSFULLY!' as final_status;

