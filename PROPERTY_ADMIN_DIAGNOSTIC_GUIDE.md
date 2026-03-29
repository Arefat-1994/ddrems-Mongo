# Property Admin Pending Requests - Diagnostic Guide

## Quick Check Commands

### 1. Check if Property Admins Exist
```sql
SELECT id, name, email FROM users WHERE role = 'property_admin';
```
**Expected**: Should show at least one property admin

### 2. Check if Properties are Assigned to Admins
```sql
SELECT COUNT(*) as properties_with_admin FROM properties WHERE property_admin_id IS NOT NULL;
SELECT COUNT(*) as properties_without_admin FROM properties WHERE property_admin_id IS NULL;
```
**Expected**: `properties_with_admin` should be > 0

### 3. Check Pending Agreements
```sql
SELECT ar.id, ar.status, p.title, p.property_admin_id, c.name as customer_name
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users c ON ar.customer_id = c.id
WHERE ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;
```
**Expected**: Should show pending agreements with property_admin_id assigned

### 4. Check Pending Key Requests
```sql
SELECT rk.id, rk.status, p.title, p.property_admin_id, c.name as customer_name
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users c ON rk.customer_id = c.id
WHERE rk.status = 'pending';
```
**Expected**: Should show pending key requests with property_admin_id assigned

### 5. Check Pending Requests for Specific Admin (ID = 8)
```sql
-- Pending Agreements
SELECT ar.id, ar.status, p.title, 'agreement' as type
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;

-- Pending Key Requests
SELECT rk.id, rk.status, p.title, 'key' as type
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
WHERE p.property_admin_id = 8 AND rk.status = 'pending';
```

## Run Full Diagnostic
```bash
mysql -u root -p ddrems < database/CHECK_PROPERTY_ADMIN_PENDING.sql
```

## Troubleshooting Steps

### Issue: No pending requests showing
**Check 1**: Are properties assigned to admins?
```sql
SELECT id, title, property_admin_id FROM properties LIMIT 5;
```
- If `property_admin_id` is NULL, assign properties to admins:
```sql
UPDATE properties SET property_admin_id = 8 WHERE property_admin_id IS NULL;
```

**Check 2**: Do pending requests exist?
```sql
SELECT COUNT(*) FROM agreement_requests WHERE status = 'pending_admin_review';
SELECT COUNT(*) FROM request_key WHERE status = 'pending';
```
- If count is 0, create test requests

**Check 3**: Are requests linked to properties with admins?
```sql
SELECT ar.id, p.property_admin_id
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE ar.status = 'pending_admin_review'
LIMIT 5;
```
- If `property_admin_id` is NULL, the property isn't assigned

### Issue: Dashboard shows 0 pending but database has pending requests
**Check**: Is the API being called with admin_id parameter?
```
GET /api/agreement-requests/admin/pending?admin_id=8
```
- Without `?admin_id=8`, the endpoint returns all requests
- With `?admin_id=8`, it filters by property_admin_id

**Check**: Is the frontend passing user.id correctly?
- Open browser DevTools → Network tab
- Look for `/api/agreement-requests/admin/pending?admin_id=...`
- Verify the admin_id matches the logged-in user's ID

### Issue: API returns empty array
**Check 1**: Verify the query works in MySQL:
```sql
SELECT ar.id, ar.status, p.title, p.property_admin_id
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;
```

**Check 2**: Verify the admin_id in the URL matches a real admin:
```sql
SELECT id, name FROM users WHERE id = 8 AND role = 'property_admin';
```

**Check 3**: Check if there are any requests at all:
```sql
SELECT COUNT(*) FROM agreement_requests;
SELECT COUNT(*) FROM request_key;
```

## Data Assignment Checklist

- [ ] Property admins exist in users table
- [ ] Properties have property_admin_id assigned
- [ ] Pending agreements exist with status = 'pending_admin_review'
- [ ] Pending key requests exist with status = 'pending'
- [ ] Requests are linked to properties with admins
- [ ] API is called with ?admin_id parameter
- [ ] Frontend passes correct user.id
- [ ] Database queries return results

## Expected Flow

1. **Customer creates request** → Request created with status 'pending_admin_review'
2. **Property has admin** → property_admin_id is set
3. **Admin logs in** → Dashboard fetches `/api/agreement-requests/admin/pending?admin_id=USER_ID`
4. **Backend filters** → Returns only requests where property_admin_id = USER_ID
5. **Dashboard displays** → Shows pending count and requests

## Quick Fix Commands

### Assign all properties to admin 8
```sql
UPDATE properties SET property_admin_id = 8 WHERE property_admin_id IS NULL;
```

### Check what admin 8 should see
```sql
SELECT 
  'Pending Agreements' as type,
  COUNT(*) as count
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 8 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
UNION ALL
SELECT 
  'Pending Key Requests' as type,
  COUNT(*) as count
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
WHERE p.property_admin_id = 8 AND rk.status = 'pending';
```

### View all pending requests with admin info
```sql
SELECT 
  ar.id,
  'agreement' as type,
  ar.status,
  p.title,
  u.name as admin_name,
  c.name as customer_name
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
LEFT JOIN users c ON ar.customer_id = c.id
WHERE ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL
UNION ALL
SELECT 
  rk.id,
  'key' as type,
  rk.status,
  p.title,
  u.name as admin_name,
  c.name as customer_name
FROM request_key rk
JOIN properties p ON rk.property_id = p.id
LEFT JOIN users u ON p.property_admin_id = u.id
LEFT JOIN users c ON rk.customer_id = c.id
WHERE rk.status = 'pending'
ORDER BY admin_name;
```

## Testing Steps

1. **Create a test property** and assign to admin 8
2. **Create a test agreement request** for that property
3. **Login as admin 8**
4. **Check dashboard** - should show pending count
5. **Click on pending stat** - should navigate to agreements view
6. **Verify request appears** in the list

## Performance Notes

- Queries use indexes on `property_admin_id` and `status`
- Should return results in < 100ms
- If slow, check if indexes exist:
```sql
SHOW INDEX FROM properties WHERE Column_name = 'property_admin_id';
SHOW INDEX FROM agreement_requests WHERE Column_name = 'property_admin_id';
```
