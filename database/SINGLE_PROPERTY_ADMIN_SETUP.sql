-- ============================================================================
-- SINGLE PROPERTY ADMIN SETUP
-- ============================================================================
-- This migration sets up the system for a single static property admin
-- All properties are automatically assigned to this one admin

-- Step 1: Find the property admin user
-- Assuming the property admin has ID 8 (adjust if different)
SELECT 'Finding Property Admin' as step;
SELECT id, name, email, role FROM users WHERE role = 'property_admin' LIMIT 1;

-- Step 2: Get the property admin ID (store this value)
-- We'll use this ID to assign all properties
SET @admin_id = (SELECT id FROM users WHERE role = 'property_admin' LIMIT 1);

-- Step 3: Assign all properties to the single property admin
UPDATE properties SET property_admin_id = @admin_id WHERE property_admin_id IS NULL;

-- Step 4: Verify all properties are now assigned
SELECT 'Properties Assignment Status' as step;
SELECT 
  COUNT(*) as total_properties,
  SUM(CASE WHEN property_admin_id IS NOT NULL THEN 1 ELSE 0 END) as assigned_to_admin,
  SUM(CASE WHEN property_admin_id IS NULL THEN 1 ELSE 0 END) as unassigned
FROM properties;

-- Step 5: Show the admin and their properties
SELECT 'Property Admin and Assigned Properties' as step;
SELECT 
  u.id as admin_id,
  u.name as admin_name,
  u.email,
  COUNT(p.id) as total_properties
FROM users u
LEFT JOIN properties p ON u.id = p.property_admin_id
WHERE u.role = 'property_admin'
GROUP BY u.id, u.name, u.email;

-- Step 6: Show pending requests for the admin
SELECT 'Pending Agreements for Admin' as step;
SELECT 
  ar.id,
  ar.status,
  ar.current_step,
  p.title as property_title,
  c.name as customer_name,
  o.name as owner_name,
  ar.created_at
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users c ON ar.customer_id = c.id
LEFT JOIN users o ON ar.owner_id = o.id
WHERE p.property_admin_id = @admin_id 
  AND ar.status = 'pending_admin_review' 
  AND ar.forwarded_to_owner_date IS NULL
ORDER BY ar.created_at DESC;

-- Step 7: Show pending key requests for the admin
SELECT 'Pending Key Requests for Admin' as step;
SELECT 
  rk.id,
  rk.status,
  p.title as property_title,
  c.name as customer_name,
  o.name as owner_name,
  rk.created_at
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users c ON rk.customer_id = c.id
LEFT JOIN users o ON rk.owner_id = o.id
WHERE p.property_admin_id = @admin_id 
  AND rk.status = 'pending'
ORDER BY rk.created_at DESC;

-- Step 8: Summary statistics
SELECT 'Summary Statistics' as step;
SELECT 
  'Total Properties' as metric,
  COUNT(*) as value
FROM properties
UNION ALL
SELECT 'Pending Agreements', COUNT(*) FROM agreement_requests 
  WHERE status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL
UNION ALL
SELECT 'Pending Key Requests', COUNT(*) FROM request_key WHERE status = 'pending'
UNION ALL
SELECT 'Total Pending for Admin', 
  (SELECT COUNT(*) FROM agreement_requests ar
   JOIN properties p ON ar.property_id = p.id
   WHERE p.property_admin_id = @admin_id AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL) +
  (SELECT COUNT(*) FROM request_key rk
   JOIN properties p ON rk.property_id = p.id
   WHERE p.property_admin_id = @admin_id AND rk.status = 'pending');

-- Step 9: Confirmation
SELECT 'Setup Complete!' as status;
SELECT CONCAT('All properties assigned to admin ID: ', @admin_id) as message;
