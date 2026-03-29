-- Add agreement document-related fields to agreements table

ALTER TABLE agreements 
ADD COLUMN IF NOT EXISTS owner_signature TEXT,
ADD COLUMN IF NOT EXISTS customer_signature TEXT,
ADD COLUMN IF NOT EXISTS owner_signed_at DATETIME,
ADD COLUMN IF NOT EXISTS customer_signed_at DATETIME,
ADD COLUMN IF NOT EXISTS agreement_html LONGTEXT,
ADD COLUMN IF NOT EXISTS additional_terms TEXT,
ADD COLUMN IF NOT EXISTS duration VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS special_conditions TEXT,
ADD COLUMN IF NOT EXISTS customer_id INT,
ADD COLUMN IF NOT EXISTS agreement_text TEXT;

-- Add admin_id and forwarded_to_owner to agreement_requests if not present
ALTER TABLE agreement_requests 
ADD COLUMN IF NOT EXISTS admin_id INT,
ADD COLUMN IF NOT EXISTS forwarded_to_owner BOOLEAN DEFAULT FALSE;

SELECT '✅ Agreement fields migration complete!' as status;
