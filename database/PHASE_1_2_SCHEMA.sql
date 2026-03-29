-- ============================================================================
-- PHASE 1 & 2: Message Reply System + Sidebar Consolidation
-- ============================================================================

USE ddrems;

-- ============================================================================
-- 1. CREATE MESSAGE_REPLIES TABLE (for tracking reply chains)
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_replies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_message_id INT NOT NULL,
  reply_message_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_message_id) REFERENCES messages(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_message_id),
  INDEX idx_reply (reply_message_id),
  UNIQUE KEY unique_reply (parent_message_id, reply_message_id)
);

-- ============================================================================
-- 2. ADD PARENT_ID COLUMN TO MESSAGES TABLE (if not exists)
-- ============================================================================

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS parent_id INT AFTER receiver_id,
ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0 AFTER is_group,
ADD FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE;

-- ============================================================================
-- 3. VERIFY TABLE STRUCTURES
-- ============================================================================

SELECT '✅ Message_replies table created' as status;
DESCRIBE message_replies;

SELECT '✅ Messages table updated' as status;
DESCRIBE messages;

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

ALTER TABLE messages 
ADD INDEX IF NOT EXISTS idx_parent_id (parent_id),
ADD INDEX IF NOT EXISTS idx_reply_count (reply_count);

SELECT '✅ All indexes created' as status;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

SELECT '✅ PHASE 1 & 2 SCHEMA SETUP COMPLETE!' as final_status;

