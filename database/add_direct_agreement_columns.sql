-- Add missing columns to agreement_requests table for direct agreements
-- Run this in PostgreSQL

-- Add is_direct_agreement column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS is_direct_agreement BOOLEAN DEFAULT FALSE;

-- Add proposed_price column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS proposed_price DECIMAL(15, 2);

-- Add agreement_type column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS agreement_type VARCHAR(20) DEFAULT 'sale';

-- Add rental_duration_months column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS rental_duration_months INTEGER;

-- Add payment_schedule column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payment_schedule VARCHAR(20) DEFAULT 'monthly';

-- Add security_deposit column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(15, 2);

-- Add move_in_date column
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS move_in_date DATE;

-- Update the view to include the new columns
CREATE OR REPLACE VIEW v_agreement_status AS
SELECT
  ar.id,
  ar.customer_id,
  ar.owner_id,
  ar.property_id,
  ar.status,
  ar.current_step,
  ar.request_date,
  ar.created_at,
  ar.completed_date,
  ar.is_direct_agreement,
  ar.proposed_price,
  ar.agreement_type,
  ar.rental_duration_months,
  ar.payment_schedule,
  ar.security_deposit,
  ar.move_in_date,
  p.title as property_title,
  p.price as property_price,
  c.name as customer_name,
  o.name as owner_name,
  pa.name as admin_name,
  ar.total_commission
FROM agreement_requests ar
LEFT JOIN properties p ON ar.property_id = p.id
LEFT JOIN users c ON ar.customer_id = c.id
LEFT JOIN users o ON ar.owner_id = o.id
LEFT JOIN users pa ON ar.property_admin_id = pa.id;