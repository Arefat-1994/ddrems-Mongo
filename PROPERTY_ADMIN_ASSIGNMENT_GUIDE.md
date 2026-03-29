# Property Admin Assignment System - Implementation Guide

## Overview
This system ensures that each Property Admin only sees agreement and key requests for properties assigned to them. Previously, all admins saw all requests regardless of property assignment.

## What Was Fixed

### 1. Database Schema Changes
- **Added `property_admin_id` column to `properties` table**
  - Links each property to a specific property admin
  - Allows filtering of requests by assigned admin
  - Foreign key constraint ensures referential integrity

### 2. Backend API Updates

#### Agreement Requests Endpoint (`/api/agreement-requests/admin/pending`)
- **Before**: Returned ALL pending agreements to ALL admins
- **After**: Filters by `property_admin_id` query parameter
- **Usage**: `/api/agreement-requests/admin/pending?admin_id=5`

#### Key Requests Endpoint (`/api/key-requests/admin/pending`)
- **Before**: Returned ALL pending key requests to ALL admins
- **After**: Filters by `property_admin_id` query parameter
- **Usage**: `/api/key-requests/admin/pending?admin_id=5`

#### History Endpoints
- Both `/admin/history` endpoints now also filter by property_admin_id

### 3. Frontend Updates

#### PropertyAdminDashboard Component
- Now passes `admin_id` (user.id) when fetching pending requests
- Pending count now shows only requests for assigned properties
- Stat card displays accurate pending agreement count

## Installation Steps

### Step 1: Run Database Migration
```bash
mysql -u root -p ddrems < database/PROPERTY_ADMIN_ASSIGNMENT.sql
```

### Step 2: Assign Properties to Admins
You can assign properties to admins in two ways:

#### Option A: Via SQL (Manual Assignment)
```sql
-- Assign property ID 1 to property admin ID 5
UPDATE properties SET property_admin_id = 5 WHERE id = 1;

-- Assign all properties to property admin ID 5
UPDATE properties SET property_admin_id = 5 WHERE property_admin_id IS NULL;
```

#### Option B: Create an Admin Panel (Recommended)
Add a new endpoint to assign properties:
```javascript
router.put('/:propertyId/assign-admin', async (req, res) => {
  const { property_admin_id } = req.body;
  await db.query('UPDATE properties SET property_admin_id = ? WHERE id = ?', 
    [property_admin_id, req.params.propertyId]);
  res.json({ message: 'Property assigned successfully' });
});
```

### Step 3: Verify Installation
```sql
-- Check properties with assigned admins
SELECT id, title, property_admin_id FROM properties WHERE property_admin_id IS NOT NULL;

-- Check pending agreements for a specific admin
SELECT ar.*, p.title, p.property_admin_id 
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 5 AND ar.status = 'pending';
```

## How It Works

### Request Flow
1. **Customer creates agreement/key request** for a property
2. **Property has property_admin_id** assigned
3. **PropertyAdminDashboard fetches pending requests** with `?admin_id=USER_ID`
4. **Backend filters** by `property_admin_id = USER_ID`
5. **Only matching requests** are returned to that admin

### Example Scenario
- Property ID 1 → Assigned to Admin ID 5
- Property ID 2 → Assigned to Admin ID 6
- Customer creates agreement request for Property 1
- Admin 5 sees the request ✅
- Admin 6 does NOT see the request ✅

## API Endpoints

### Get Pending Agreements (Property Admin Only)
```
GET /api/agreement-requests/admin/pending?admin_id=5
```
**Response**: Array of pending agreements for properties assigned to admin 5

### Get Pending Key Requests (Property Admin Only)
```
GET /api/key-requests/admin/pending?admin_id=5
```
**Response**: Array of pending key requests for properties assigned to admin 5

### Get Agreement History (Property Admin Only)
```
GET /api/agreement-requests/admin/history?admin_id=5
```
**Response**: Array of completed/forwarded agreements for admin 5's properties

### Get Key Request History (Property Admin Only)
```
GET /api/key-requests/admin/history?admin_id=5
```
**Response**: Array of completed key requests for admin 5's properties

## Notifications

### Automatic Notifications
When an agreement/key request is created:
1. **System Admin** gets notified (all requests)
2. **Assigned Property Admin** gets notified (their properties only)
3. **Property Owner** gets notified (their properties)

### Notification Types
- `pending_admin_review` - New request needs admin review
- `agreement_forwarded` - Admin forwarded to owner
- `key_sent` - Key sent to customer
- `agreement_accepted` - Owner accepted agreement

## Troubleshooting

### Issue: Property Admin sees no pending requests
**Solution**: 
1. Check if property has `property_admin_id` assigned
   ```sql
   SELECT id, title, property_admin_id FROM properties WHERE id = ?;
   ```
2. Verify the admin_id matches the user.id
3. Check if requests exist and are pending
   ```sql
   SELECT * FROM agreement_requests WHERE property_id = ? AND status = 'pending';
   ```

### Issue: All admins see all requests
**Solution**:
1. Verify database migration was applied
   ```sql
   DESCRIBE properties; -- Should show property_admin_id column
   ```
2. Check that properties have property_admin_id values
   ```sql
   SELECT COUNT(*) FROM properties WHERE property_admin_id IS NULL;
   ```

### Issue: Requests not showing in dashboard
**Solution**:
1. Verify the API is being called with admin_id parameter
2. Check browser console for API errors
3. Verify user.id is being passed correctly
4. Check database for matching records

## Future Enhancements

1. **Admin Assignment UI**
   - Add property assignment interface in admin dashboard
   - Bulk assign properties to admins
   - View admin workload distribution

2. **Workload Balancing**
   - Auto-assign new properties to least busy admin
   - Redistribute properties based on workload

3. **Admin Permissions**
   - Allow admins to only modify their assigned properties
   - Prevent cross-admin interference

4. **Reporting**
   - Per-admin performance metrics
   - Request handling time by admin
   - Admin workload analytics

## Files Modified

1. `database/PROPERTY_ADMIN_ASSIGNMENT.sql` - Database migration
2. `server/routes/agreement-requests.js` - Added admin_id filtering
3. `server/routes/key-requests.js` - Added admin_id filtering
4. `client/src/components/PropertyAdminDashboard.js` - Pass admin_id in requests

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Properties have property_admin_id assigned
- [ ] PropertyAdminDashboard shows pending count > 0
- [ ] Clicking on pending stat navigates to agreements view
- [ ] Agreements view shows only assigned properties' requests
- [ ] Key requests view shows only assigned properties' requests
- [ ] History shows only assigned properties' completed requests
- [ ] Different admins see different requests
- [ ] System admin can see all requests (if needed)
