-- Consolidated Migration for Agreement & Key Requests

-- 1. Add new columns to agreement_requests
ALTER TABLE agreement_requests 
ADD COLUMN IF NOT EXISTS request_type ENUM('key', 'agreement') DEFAULT 'agreement' AFTER customer_id,
ADD COLUMN IF NOT EXISTS key_code VARCHAR(50) AFTER request_type,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP NULL AFTER updated_at;

-- 2. Migrate existing key_requests to agreement_requests if they exist
-- (This is just in case any were created during earlier dev steps)
INSERT INTO agreement_requests (property_id, customer_id, request_type, key_code, status, request_message, response_message, admin_id, created_at, responded_at)
SELECT property_id, customer_id, 'key', key_code, 
       CASE 
         WHEN status = 'sent' THEN 'accepted' 
         WHEN status = 'expired' THEN 'rejected'
         ELSE 'pending' 
       END, 
       request_message, response_message, admin_id, requested_at, responded_at
FROM key_requests;

-- 3. Drop the obsolete key_requests table
DROP TABLE IF EXISTS key_requests;

-- 4. Ensure agreement_requests has necessary mediation fields (already added in previous turn but reinforcing)
ALTER TABLE agreement_requests 
MODIFY COLUMN admin_id INT AFTER broker_id;
