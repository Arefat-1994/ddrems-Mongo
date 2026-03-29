-- Migration script for Agreement & Key Request Workflow

-- Create key_requests table
CREATE TABLE IF NOT EXISTS key_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    customer_id INT NOT NULL,
    admin_id INT, -- The property admin who handled it
    key_code VARCHAR(50),
    status ENUM('pending', 'sent', 'used', 'expired') DEFAULT 'pending',
    request_message TEXT,
    response_message TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update agreement_requests table to include mediation fields if not present
-- (Assuming agreement_requests already exists from previous research)
ALTER TABLE agreement_requests 
ADD COLUMN IF NOT EXISTS admin_id INT AFTER broker_id,
ADD COLUMN IF NOT EXISTS forwarded_to_owner BOOLEAN DEFAULT FALSE;

-- Ensure agreements table has document tracking
ALTER TABLE agreements
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS access_key_used VARCHAR(50);
