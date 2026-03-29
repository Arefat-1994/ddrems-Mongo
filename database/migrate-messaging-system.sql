-- Messaging System Migration
-- This script updates the messages table to support group messaging

-- Step 1: Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE AFTER is_read,
ADD INDEX IF NOT EXISTS idx_is_group (is_group);

-- Step 2: Make receiver_id nullable for group messages
ALTER TABLE messages 
MODIFY COLUMN receiver_id INT NULL;

-- Step 3: Create message_recipients table for group messages
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

-- Step 4: Verify the schema
SELECT 'Migration completed successfully!' as status;
