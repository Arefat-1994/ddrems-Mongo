-- ============================================================================
-- CHECK PROPERTY ADMIN PENDING REQUESTS
-- ============================================================================
-- This script checks if property admins have pending agreement and key requests

-- Step 1: Check all property admins
SELECT 'STEP 1: All Property Admins' as step;
SELECT id, name, email, role FROM users WHERE role = 'property_admin';

-- Step 2: Check properties assigned to each admin
SELECT 'STEP 2: Properties Assigned to Each Admin' as step;
SELECT 
  p.property_admin_id,
  u.name as admin_name,
  COUNT(p.id) as total_properties,
  GROUP_CONCAT(p.id) as property_ids
FROM properties p
LEFT JOIN users u ON p.property_admin_id = u.id
WHERE p.property_admin_id IS NOT NULL
GROUP BY p.property_admin_id, u.name;

-- Step 3: Check pending agreements for each admin
SELECT 'STEP 3: Pending Agreements by Admin' as step;
SELECT 
  p.property_admin_id,
  u.name as admin_name,
  COUNT(ar.id) as pending_agreements,
  GROUP_CONCAT(ar.id) as agreement_ids,
  GROUP_CONCAT(p.title) as property_titles
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
WHERE ar.status = 'pending_admin_review' 
  AND ar.forwarded_to_owner_date IS NULL
  AND p.property_admin_id IS NOT NULL
GROUP BY p.property_admin_id, u.name;

-- Step 4: Check pending key requests for each admin
SELECT 'STEP 4: Pending Key Requests by Admin' as step;
SELECT 
  p.property_admin_id,
  u.name as admin_name,
  COUNT(rk.id) as pending_keys,
  GROUP_CONCAT(rk.id) as key_request_ids,
  GROUP_CONCAT(p.title) as property_titles
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
WHERE rk.status = 'pending'
  AND p.property_admin_id IS NOT NULL
GROUP BY p.property_admin_id, u.name;

-- Step 5: Check total pending requests per admin
SELECT 'STEP 5: Total Pending Requests per Admin' as step;
SELECT 
  u.id,
  u.name as admin_name,
  u.email,
  COALESCE(pending_agreements.count, 0) as pending_agreements,
  COALESCE(pending_keys.count, 0) as pending_keys,
  COALESCE(pending_agreements.count, 0) + COALESCE(pending_keys.count, 0) as total_pending
FROM users u
LEFT JOIN (
  SELECT p.property_admin_id, COUNT(ar.id) as count
  FROM agreement_requests ar
  JOIN properties p ON ar.property_id = p.id
  WHERE ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
  GROUP BY p.property_admin_id
) pending_agreements ON u.id = pending_agreements.property_admin_id
LEFT JOIN (
  SELECT p.property_admin_id, COUNT(rk.id) as count
  FROM request_key rk
  JOIN properties p ON rk.property_id = p.id
  WHERE rk.status = 'pending'
  GROUP BY p.property_admin_id
) pending_keys ON u.id = pending_keys.property_admin_id
WHERE u.role = 'property_admin'
ORDER BY total_pending DESC;

-- Step 6: Check properties without admin assignment
SELECT 'STEP 6: Properties Without Admin Assignment' as step;
SELECT 
  id,
  title,
  location,
  property_admin_id,
  status
FROM properties
WHERE property_admin_id IS NULL
LIMIT 10;

-- Step 7: Detailed pending agreements view
SELECT 'STEP 7: Detailed Pending Agreements' as step;
SELECT 
  ar.id as agreement_id,
  ar.status,
  ar.current_step,
  ar.forwarded_to_owner_date,
  p.id as property_id,
  p.title as property_title,
  p.property_admin_id,
  u.name as admin_name,
  c.name as customer_name,
  o.name as owner_name,
  ar.created_at,
  ar.customer_notes
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
LEFT JOIN users c ON ar.customer_id = c.id
LEFT JOIN users o ON ar.owner_id = o.id
WHERE ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
ORDER BY ar.created_at DESC;

-- Step 8: Detailed pending key requests view
SELECT 'STEP 8: Detailed Pending Key Requests' as step;
SELECT 
  rk.id as key_request_id,
  rk.status,
  p.id as property_id,
  p.title as property_title,
  p.property_admin_id,
  u.name as admin_name,
  c.name as customer_name,
  o.name as owner_name,
  rk.created_at,
  rk.request_message
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
LEFT JOIN users c ON rk.customer_id = c.id
LEFT JOIN users o ON rk.owner_id = o.id
WHERE rk.status = 'pending'
ORDER BY rk.created_at DESC;

-- Step 9: Check if admin_id parameter is being used correctly
SELECT 'STEP 9: Sample Query for Admin ID 8' as step;
SELECT 
  ar.id,
  ar.status,
  p.title,
  p.property_admin_id,
  'agreement' as type
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
UNION ALL
SELECT 
  rk.id,
  rk.status,
  p.title,
  p.property_admin_id,
  'key' as type
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
WHERE p.property_admin_id = 8 AND rk.status = 'pending';

-- Step 10: Summary statistics
SELECT 'STEP 10: Summary Statistics' as step;
SELECT 
  'Total Property Admins' as metric,
  COUNT(*) as value
FROM users WHERE role = 'property_admin'
UNION ALL
SELECT 'Total Properties', COUNT(*) FROM properties
UNION ALL
SELECT 'Properties with Admin', COUNT(*) FROM properties WHERE property_admin_id IS NOT NULL
UNION ALL
SELECT 'Properties without Admin', COUNT(*) FROM properties WHERE property_admin_id IS NULL
UNION ALL
SELECT 'Pending Agreements', COUNT(*) FROM agreement_requests WHERE status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL
UNION ALL
SELECT 'Pending Key Requests', COUNT(*) FROM request_key WHERE status = 'pending'
UNION ALL
SELECT 'Total Pending Requests', 
  (SELECT COUNT(*) FROM agreement_requests WHERE status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL) +
  (SELECT COUNT(*) FROM request_key WHERE status = 'pending');
