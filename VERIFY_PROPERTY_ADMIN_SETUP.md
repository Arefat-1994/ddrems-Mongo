# Verify Property Admin Setup - Complete Checklist

## Step 1: Verify Database Schema
Run this to check if everything is set up correctly:

```sql
-- Check if property_admin_id column exists
DESCRIBE properties;
-- Should show: property_admin_id INT

-- Check if agreement_requests has correct columns
DESCRIBE agreement_requests;
-- Should show: status, current_step, forwarded_to_owner_date, property_admin_id

-- Check if request_key table exists
DESCRIBE request_key;
-- Should show: status, property_id
```

## Step 2: Check Property Admin Users
```sql
SELECT id, name, email, role FROM users WHERE role = 'property_admin';
```
**Expected**: At least 1 property admin exists
**If empty**: Create a property admin user first

## Step 3: Assign Properties to Admins
```sql
-- Check how many properties are assigned
SELECT COUNT(*) as assigned FROM properties WHERE property_admin_id IS NOT NULL;
SELECT COUNT(*) as unassigned FROM properties WHERE property_admin_id IS NULL;

-- Assign unassigned properties to admin 8
UPDATE properties SET property_admin_id = 8 WHERE property_admin_id IS NULL;
```

## Step 4: Create Test Data (Optional)
If you don't have pending requests, create test data:

```sql
-- Create a test agreement request
INSERT INTO agreement_requests (
  customer_id, 
  owner_id, 
  property_id, 
  status, 
  current_step, 
  customer_notes
) VALUES (
  15,  -- customer_id
  6,   -- owner_id
  1,   -- property_id (must have property_admin_id assigned)
  'pending_admin_review',
  1,
  'Test agreement request'
);

-- Create a test key request
INSERT INTO request_key (
  property_id,
  customer_id,
  owner_id,
  status,
  request_message
) VALUES (
  1,   -- property_id (must have property_admin_id assigned)
  15,  -- customer_id
  6,   -- owner_id
  'pending',
  'Test key request'
);
```

## Step 5: Verify Pending Requests
```sql
-- Check pending agreements
SELECT ar.id, ar.status, p.title, p.property_admin_id, c.name as customer
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users c ON ar.customer_id = c.id
WHERE ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;

-- Check pending key requests
SELECT rk.id, rk.status, p.title, p.property_admin_id, c.name as customer
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users c ON rk.customer_id = c.id
WHERE rk.status = 'pending';
```

## Step 6: Test API Endpoints
```bash
# Get pending agreements for admin 8
curl "http://localhost:5000/api/agreement-requests/admin/pending?admin_id=8"

# Get pending key requests for admin 8
curl "http://localhost:5000/api/key-requests/admin/pending?admin_id=8"

# Get history for admin 8
curl "http://localhost:5000/api/agreement-requests/admin/history?admin_id=8"
curl "http://localhost:5000/api/key-requests/admin/history?admin_id=8"
```

## Step 7: Test Dashboard
1. Login as property admin (user ID 8)
2. Check dashboard stat card for pending agreements
3. Should show count > 0 if pending requests exist
4. Click on pending stat
5. Should navigate to agreements view
6. Should see pending requests listed

## Step 8: Verify Frontend Integration
Open browser DevTools → Network tab:
1. Look for API calls to `/api/agreement-requests/admin/pending?admin_id=...`
2. Verify the admin_id matches the logged-in user's ID
3. Check response contains pending requests

## Complete Verification Query
Run this single query to see everything:

```sql
SELECT 
  'Property Admins' as category,
  COUNT(*) as count
FROM users WHERE role = 'property_admin'
UNION ALL
SELECT 'Properties with Admin', COUNT(*) FROM properties WHERE property_admin_id IS NOT NULL
UNION ALL
SELECT 'Properties without Admin', COUNT(*) FROM properties WHERE property_admin_id IS NULL
UNION ALL
SELECT 'Pending Agreements', COUNT(*) FROM agreement_requests 
  WHERE status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL
UNION ALL
SELECT 'Pending Key Requests', COUNT(*) FROM request_key WHERE status = 'pending'
UNION ALL
SELECT 'Pending for Admin 8 (Agreements)', COUNT(*) FROM agreement_requests ar
  JOIN properties p ON ar.property_id = p.id
  WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
UNION ALL
SELECT 'Pending for Admin 8 (Keys)', COUNT(*) FROM request_key rk
  JOIN properties p ON rk.property_id = p.id
  WHERE p.property_admin_id = 8 AND rk.status = 'pending';
```

## Troubleshooting

### Problem: Dashboard shows 0 pending
**Solution 1**: Check if properties are assigned
```sql
SELECT COUNT(*) FROM properties WHERE property_admin_id IS NOT NULL;
-- If 0, run: UPDATE properties SET property_admin_id = 8 WHERE property_admin_id IS NULL;
```

**Solution 2**: Check if pending requests exist
```sql
SELECT COUNT(*) FROM agreement_requests WHERE status = 'pending_admin_review';
SELECT COUNT(*) FROM request_key WHERE status = 'pending';
-- If 0, create test data (see Step 4)
```

**Solution 3**: Check if requests are linked to properties with admins
```sql
SELECT ar.id, p.property_admin_id
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE ar.status = 'pending_admin_review'
LIMIT 5;
-- If property_admin_id is NULL, assign properties to admins
```

### Problem: API returns empty array
**Solution**: Verify the query works
```sql
SELECT ar.id FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;
```

### Problem: API returns error
**Solution**: Check server logs for error message and verify:
1. Database connection is working
2. Tables exist with correct columns
3. Indexes are created

## Files to Review

1. `database/PROPERTY_ADMIN_ASSIGNMENT_FIXED.sql` - Database migration
2. `server/routes/agreement-requests.js` - Backend filtering
3. `server/routes/key-requests.js` - Backend filtering
4. `client/src/components/PropertyAdminDashboard.js` - Frontend integration

## Success Indicators

✅ Property admins exist in database
✅ Properties have property_admin_id assigned
✅ Pending requests exist with correct status
✅ API returns filtered results
✅ Dashboard shows pending count
✅ Clicking pending navigates to view
✅ Requests display in list
✅ Different admins see different requests

## Next Steps

1. Run verification queries
2. Assign properties to admins if needed
3. Create test requests if needed
4. Test API endpoints
5. Test dashboard functionality
6. Monitor logs for any errors
