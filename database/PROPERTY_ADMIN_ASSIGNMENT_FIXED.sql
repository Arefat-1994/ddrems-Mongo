-- ============================================================================
-- PROPERTY ADMIN ASSIGNMENT SYSTEM (FIXED)
-- ============================================================================
-- This migration adds the ability to assign properties to specific property admins
-- so that each property admin only sees agreements and key requests for their assigned properties

-- Step 1: Add property_admin_id column to properties table
ALTER TABLE properties ADD COLUMN property_admin_id INT AFTER broker_id;

-- Step 2: Add foreign key constraint
ALTER TABLE properties ADD CONSTRAINT fk_property_admin 
  FOREIGN KEY (property_admin_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 3: Create indexes for faster queries
CREATE INDEX idx_property_admin ON properties(property_admin_id);
CREATE INDEX idx_properties_admin_status ON properties(property_admin_id, status);

-- Step 4: Assign all existing properties to the first property admin (if any exist)
-- This ensures existing properties are assigned to someone
UPDATE properties 
SET property_admin_id = (SELECT id FROM users WHERE role = 'property_admin' LIMIT 1)
WHERE property_admin_id IS NULL AND id IN (SELECT id FROM properties LIMIT 100);

-- Step 5: Create a view for property admin dashboard stats
-- Uses correct column names from AGREEMENT_WORKFLOW_SCHEMA
CREATE OR REPLACE VIEW v_property_admin_stats AS
SELECT 
  p.property_admin_id,
  COUNT(DISTINCT p.id) as total_properties,
  SUM(CASE WHEN p.status = 'active' THEN 1 ELSE 0 END) as active_properties,
  SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) as pending_properties,
  SUM(CASE WHEN ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL THEN 1 ELSE 0 END) as pending_agreements,
  SUM(CASE WHEN rk.status = 'pending' THEN 1 ELSE 0 END) as pending_keys
FROM properties p
LEFT JOIN agreement_requests ar ON p.id = ar.property_id
LEFT JOIN request_key rk ON p.id = rk.property_id
WHERE p.property_admin_id IS NOT NULL
GROUP BY p.property_admin_id;

-- Step 6: Verify the changes
SELECT 'Property Admin Assignment System Installed Successfully' as status;
SELECT COUNT(*) as properties_with_admin FROM properties WHERE property_admin_id IS NOT NULL;
SELECT COUNT(*) as properties_without_admin FROM properties WHERE property_admin_id IS NULL;
