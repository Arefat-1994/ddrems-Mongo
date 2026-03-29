-- Check current column definition
DESCRIBE notifications;

-- Increase notification_type column size if needed
ALTER TABLE notifications MODIFY COLUMN notification_type VARCHAR(100);

-- Verify the change
DESCRIBE notifications;
