# Property Admin Assignment System - CORRECTED Implementation Guide

## Overview
This system ensures that each Property Admin only sees agreement and key requests for properties assigned to them. This corrected version uses the proper column names from the AGREEMENT_WORKFLOW_SCHEMA.

## What Was Fixed

### 1. Database Schema Corrections
- **Column Name**: Changed from `forwarded_to_owner` (BOOLEAN) to `forwarded_to_owner_date` (TIMESTAMP)
- **Status Values**: Changed from generic statuses to workflow-specific statuses:
  - `pending_admin_review` (instead of `pending`)
  - `owner_accepted` / `owner_rejected` (instead of `accepted` / `rejected`)
  - `completed` (instead of `completed`)

### 2. Backend API Updates

#### Agreement Requests Endpoint (`/api/agreement-requests/admin/pending`)
- **Query**: Filters by `status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL`
- **Usage**: `/api/agreement-requests/admin/pending?admin_id=5`
- **Returns**: Pending agreements awaiting admin review

#### Agreement History Endpoint (`/api/agreement-requests/admin/history`)
- **Query**: Filters by `status IN ('owner_accepted', 'owner_rejected', 'completed', 'suspended') OR forwarded_to_owner_date IS NOT NULL`
- **Returns**: Completed or forwarded agreements

#### Forward Agreement Endpoint (`PUT /api/agreement-requests/:id/forward`)
- **Updates**: Sets `forwarded_to_owner_date = NOW()` and `admin_action_date = NOW()`
- **Notification**: Sends notification to property owner

### 3. Frontend Updates
- PropertyAdminDashboard passes `admin_id` when fetching pending requests
- Pending count shows only requests for assigned properties
- Stat card displays accurate pending agreement count

## Installation Steps

### Step 1: Run Database Migration
```bash
mysql -u root -p ddrems < database/PROPERTY_ADMIN_ASSIGNMENT_FIXED.sql
```

### Step 2: Verify Installation
```sql
-- Check if property_admin_id column exists
DESCRIBE properties;

-- Check properties with assigned admins
SELECT id, title, property_admin_id FROM properties WHERE property_admin_id IS NOT NULL LIMIT 5;

-- Check pending agreements for a specific admin
SELECT ar.id, ar.status, ar.current_step, p.title, p.property_admin_id 
FROM agreement_requests ar
JOIN properties p ON ar.property_id = p.id
WHERE p.property_admin_id = 5 AND ar.status = 'pending_admin_review' AND ar.forwarded_to_owner_date IS NULL;
```

### Step 3: Assign Properties to Admins
```sql
-- Assign property ID 1 to property admin ID 5
UPDATE properties SET property_admin_id = 5 WHERE id = 1;

-- Assign all unassigned properties to property admin ID 5
UPDATE properties SET property_admin_id = 5 WHERE property_admin_id IS NULL;

-- Verify assignment
SELECT COUNT(*) FROM properties WHERE property_admin_id = 5;
```

## Agreement Workflow Status Values

The system uses these status values throughout the workflow:

| Status | Description |
|--------|-------------|
| `pending_admin_review` | Awaiting property admin review |
| `waiting_owner_response` | Forwarded to owner, awaiting response |
| `owner_accepted` | Owner accepted the agreement |
| `owner_rejected` | Owner rejected the agreement |
| `agreement_generated` | Agreement document generated |
| `customer_editing` | Customer editing agreement fields |
| `customer_submitted` | Customer submitted edited agreement |
| `admin_reviewing` | Admin reviewing customer edits |
| `waiting_owner_final_review` | Awaiting owner's final review |
| `owner_submitted` | Owner submitted final approval |
| `completed` | Agreement completed successfully |
| `suspended` | Agreement suspended |

## Key Columns in agreement_requests Table

| Column | Type | Purpose |
|--------|------|---------|
| `status` | VARCHAR(50) | Current workflow status |
| `current_step` | INT | Current step (1-10) |
| `forwarded_to_owner_date` | TIMESTAMP | When forwarded to owner (NULL if not forwarded) |
| `admin_action` | VARCHAR(20) | Admin action: 'approved', 'rejected', 'suspended' |
| `admin_action_date` | TIMESTAMP | When admin took action |
| `owner_decision` | VARCHAR(20) | Owner decision: 'accepted', 'rejected' |
| `owner_decision_date` | TIMESTAMP | When owner made decision |
| `property_admin_id` | INT | Assigned property admin |

## API Endpoints

### Get Pending Agreements (Property Admin Only)
```
GET /api/agreement-requests/admin/pending?admin_id=5
```
**Response**: Array of pending agreements for properties assigned to admin 5
**Filter**: `status = 'pending_admin_review' AND forwarded_to_owner_date IS NULL`

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
**Filter**: `status IN ('owner_accepted', 'owner_rejected', 'completed', 'suspended') OR forwarded_to_owner_date IS NOT NULL`

### Get Key Request History (Property Admin Only)
```
GET /api/key-requests/admin/history?admin_id=5
```
**Response**: Array of completed key requests for admin 5's properties

### Forward Agreement to Owner
```
PUT /api/agreement-requests/:id/forward
Body: {
  "admin_id": 5,
  "response_message": "Please review and approve this agreement"
}
```
**Updates**: Sets `forwarded_to_owner_date = NOW()` and sends notification to owner

## Workflow Example

1. **Customer creates agreement request** for Property 1
   - Status: `pending_admin_review`
   - `forwarded_to_owner_date`: NULL

2. **Property Admin reviews** and forwards to owner
   - Status: `waiting_owner_response`
   - `forwarded_to_owner_date`: NOW()
   - Notification sent to owner

3. **Owner reviews** and accepts
   - Status: `owner_accepted`
   - `owner_decision`: 'accepted'
   - `owner_decision_date`: NOW()

4. **Agreement generated** and sent to customer
   - Status: `agreement_generated`
   - `agreement_generated_date`: NOW()

5. **Customer reviews** and submits
   - Status: `customer_submitted`
   - `customer_submitted_date`: NOW()

6. **Admin reviews** customer edits
   - Status: `admin_reviewing`
   - `admin_reviewed_date`: NOW()

7. **Owner final review** and approval
   - Status: `owner_submitted`
   - `owner_final_submitted_date`: NOW()

8. **Agreement completed**
   - Status: `completed`
   - `completed_date`: NOW()

## Troubleshooting

### Issue: Property Admin sees no pending requests
**Solution**: 
1. Check if property has `property_admin_id` assigned
   ```sql
   SELECT id, title, property_admin_id FROM properties WHERE id = ?;
   ```
2. Check if requests exist with correct status
   ```sql
   SELECT * FROM agreement_requests 
   WHERE property_id = ? 
   AND status = 'pending_admin_review' 
   AND forwarded_to_owner_date IS NULL;
   ```

### Issue: View creation fails
**Solution**: Ensure both `agreement_requests` and `request_key` tables exist
```sql
SHOW TABLES LIKE 'agreement_requests';
SHOW TABLES LIKE 'request_key';
```

### Issue: Column not found error
**Solution**: Verify the correct column names exist
```sql
DESCRIBE agreement_requests;
-- Should show: forwarded_to_owner_date, admin_action, admin_action_date, etc.
```

## Files Modified

1. `database/PROPERTY_ADMIN_ASSIGNMENT_FIXED.sql` - Corrected database migration
2. `server/routes/agreement-requests.js` - Updated with correct column names
3. `server/routes/key-requests.js` - Updated with correct column names
4. `client/src/components/PropertyAdminDashboard.js` - Pass admin_id in requests

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] `property_admin_id` column exists in properties table
- [ ] Properties have `property_admin_id` assigned
- [ ] View `v_property_admin_stats` created successfully
- [ ] PropertyAdminDashboard shows pending count > 0
- [ ] Clicking on pending stat navigates to agreements view
- [ ] Agreements view shows only assigned properties' requests
- [ ] Key requests view shows only assigned properties' requests
- [ ] History shows only assigned properties' completed requests
- [ ] Different admins see different requests
- [ ] Forward agreement updates `forwarded_to_owner_date`
- [ ] Notifications sent to owner when forwarded

## Next Steps

1. **Assign properties to admins** using the SQL UPDATE statements
2. **Create test agreements** to verify filtering works
3. **Monitor logs** for any errors during request processing
4. **Create admin UI** for property assignment (optional but recommended)
