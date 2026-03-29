-- ============================================================================
-- FIX MESSAGE TABLES STRUCTURE
-- Ensure proper table structure for individual and group messages
-- ============================================================================

USE ddrems;

-- ============================================================================
-- 1. VERIFY/CREATE MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT,
  property_id INT,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'general',
  status ENUM('sent', 'delivered', 'read', 'failed') DEFAULT 'sent',
  is_read BOOLEAN DEFAULT FALSE,
  is_group BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  INDEX idx_receiver (receiver_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created (created_at),
  INDEX idx_is_group (is_group)
);

-- ============================================================================
-- 2. VERIFY/CREATE MESSAGE_RECIPIENTS TABLE (for group messages)
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

-- ============================================================================
-- 3. VERIFY/CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
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

-- ============================================================================
-- 4. MIGRATE EXISTING GROUP MESSAGES TO MESSAGE_RECIPIENTS TABLE
-- ============================================================================

-- For each group message (is_group = 1), we need to create entries in message_recipients
-- This assumes we have a way to identify who should receive group messages

-- First, let's check if there are any group messages without recipients
SELECT 'Checking for group messages without recipients...' as status;
SELECT COUNT(*) as group_messages_without_recipients 
FROM messages m 
WHERE m.is_group = 1 
AND NOT EXISTS (
  SELECT 1 FROM message_recipients mr WHERE mr.message_id = m.id
);

-- ============================================================================
-- 5. VERIFY TABLE STRUCTURE
-- ============================================================================

SELECT '✅ Messages table structure:' as info;
DESCRIBE messages;

SELECT '✅ Message_recipients table structure:' as info;
DESCRIBE message_recipients;

SELECT '✅ Notifications table structure:' as info;
DESCRIBE notifications;

-- ============================================================================
-- 6. VERIFY DATA
-- ============================================================================

SELECT '✅ Total messages:' as info;
SELECT COUNT(*) as total_messages FROM messages;

SELECT '✅ Individual messages (is_group = 0):' as info;
SELECT COUNT(*) as individual_messages FROM messages WHERE is_group = 0;

SELECT '✅ Group messages (is_group = 1):' as info;
SELECT COUNT(*) as group_messages FROM messages WHERE is_group = 1;

SELECT '✅ Message recipients:' as info;
SELECT COUNT(*) as total_recipients FROM message_recipients;

SELECT '✅ Unread messages:' as info;
SELECT COUNT(*) as unread_messages FROM messages WHERE is_read = 0;

SELECT '✅ Unread group message recipients:' as info;
SELECT COUNT(*) as unread_recipients FROM message_recipients WHERE is_read = 0;

SELECT '✅ All tables created successfully!' as status;
