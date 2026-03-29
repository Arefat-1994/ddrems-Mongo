# Messaging System - Complete Implementation Guide

## Overview
The messaging system has been completely rebuilt with proper authentication, role-based access control, and support for single, group, and bulk messaging.

## What's Fixed

### ✅ Backend (server/routes/messages.js)
1. **Authentication Middleware** - All routes now verify user identity
2. **Authorization Middleware** - Role-based access control implemented
3. **Single Message Sending** - Direct user-to-user messaging
4. **Group Messaging** - Send to multiple selected users
5. **Bulk Messaging** - Send to all users of a specific role (admin/property_admin only)
6. **Proper Error Handling** - Detailed error messages and validation
7. **Message Status Tracking** - Track sent, delivered, read status

### ✅ Frontend (client/src/components/SendMessage.js)
1. **Three Send Modes**:
   - 📧 Single User - Send to one person
   - 👥 Group Message - Send to multiple selected users
   - 📢 Bulk (By Role) - Send to all users of a role (admin/property_admin only)

2. **Role-Based UI** - Different options based on user role
3. **Proper Error Handling** - User-friendly error messages
4. **Loading States** - Disable form during submission
5. **Message Preview** - Real-time preview of message
6. **Input Validation** - Character limits and required fields

### ✅ Database (database/unified-schema.sql)
1. **Updated messages table**:
   - Added `is_group` column for group messages
   - Made `receiver_id` nullable for group messages
   - Added indexes for performance

2. **New message_recipients table**:
   - Tracks recipients of group messages
   - Tracks read status per recipient
   - Prevents duplicate recipients

## User Roles & Permissions

### System Admin (system_admin)
- ✅ Send single messages
- ✅ Send group messages
- ✅ Send bulk messages to any role
- ✅ View all messages

### Property Admin (property_admin)
- ✅ Send single messages
- ✅ Send group messages
- ✅ Send bulk messages to any role
- ✅ View all messages

### Broker
- ✅ Send single messages
- ✅ Send group messages
- ❌ Cannot send bulk messages

### Owner
- ✅ Send single messages
- ✅ Send group messages
- ❌ Cannot send bulk messages

### Customer/User
- ✅ Send single messages
- ✅ Send group messages
- ❌ Cannot send bulk messages

## Setup Instructions

### 1. Run Database Migration
```bash
node run-messaging-migration.js
```

This will:
- Add `is_group` column to messages table
- Make `receiver_id` nullable
- Create `message_recipients` table

### 2. Restart Backend Server
```bash
npm start
```

### 3. Test the System

#### Test Single Message
1. Login as any user
2. Go to "Send Message"
3. Select "Single User" mode
4. Choose a recipient
5. Fill in subject and message
6. Click "Send Message"

#### Test Group Message
1. Login as any user
2. Go to "Send Message"
3. Select "Group Message" mode
4. Select multiple users
5. Fill in subject and message
6. Click "Send Message"

#### Test Bulk Message (Admin Only)
1. Login as System Admin or Property Admin
2. Go to "Send Message"
3. Select "Bulk (By Role)" mode
4. Choose a role (e.g., "All Owners")
5. Fill in subject and message
6. Click "Send Message"

## API Endpoints

### Send Single Message
```
POST /api/messages?userId={userId}
Body: {
  receiver_id: number,
  subject: string,
  message: string,
  message_type: string (general|property|announcement|alert|payment|verification)
}
```

### Send Group Message
```
POST /api/messages?userId={userId}
Body: {
  receiver_ids: number[],
  subject: string,
  message: string,
  message_type: string,
  is_group: true
}
```

### Send Bulk Message (Admin/PropertyAdmin Only)
```
POST /api/messages/bulk?userId={userId}
Body: {
  receiver_ids: number[] (optional - if not provided, uses filter_role),
  filter_role: string (optional - owner|user|broker|property_admin|admin),
  subject: string,
  message: string,
  message_type: string
}
```

### Get User Messages
```
GET /api/messages/user/{userId}?userId={userId}
```

### Get Unread Count
```
GET /api/messages/unread/{userId}?userId={userId}
```

### Mark Message as Read
```
PUT /api/messages/read/{messageId}?userId={userId}
```

### Delete Message
```
DELETE /api/messages/{messageId}?userId={userId}
```

## Error Handling

The system now provides clear error messages:

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized" | Missing userId | Include userId in query params |
| "User not found" | Invalid userId | Verify user exists |
| "Forbidden" | Insufficient permissions | Check user role |
| "Subject and message are required" | Missing fields | Fill all required fields |
| "No valid recipients" | No recipients selected | Select at least one recipient |
| "Some receiver IDs do not exist" | Invalid recipient IDs | Verify recipient IDs |

## Message Types

- **general** - General communication
- **property** - Property-related messages
- **announcement** - System announcements
- **alert** - Important alerts
- **payment** - Payment notifications
- **verification** - Verification requests

## Features

### Single Messages
- Direct user-to-user communication
- Automatic notification creation
- Read status tracking
- Message deletion by sender

### Group Messages
- Send to multiple users at once
- Each recipient tracked separately
- Individual read status per recipient
- Efficient database storage

### Bulk Messages
- Send to all users of a specific role
- Admin/PropertyAdmin only
- Automatic role filtering
- Batch notification creation

### Security
- User authentication required
- Role-based authorization
- Sender verification
- Recipient validation
- Self-messaging prevention

### Performance
- Indexed queries for fast retrieval
- Efficient bulk operations
- Proper foreign key relationships
- Optimized message retrieval

## Troubleshooting

### "Failed to send message" Error
1. Check browser console for detailed error
2. Verify userId is passed in query params
3. Ensure recipient exists in database
4. Check user has permission to send messages

### Messages Not Appearing
1. Verify message was sent successfully
2. Check receiver_id or message_recipients table
3. Ensure user is logged in as recipient
4. Check message is_read status

### Bulk Messages Not Sending
1. Verify user is admin or property_admin
2. Check selected role has users
3. Verify all user IDs are valid
4. Check database for message_recipients entries

## Database Schema

### messages table
```sql
- id (INT, PK)
- sender_id (INT, FK)
- receiver_id (INT, FK, nullable)
- property_id (INT, FK, nullable)
- subject (VARCHAR 255)
- message (TEXT)
- message_type (VARCHAR 50)
- status (ENUM: sent|delivered|read|failed)
- is_read (BOOLEAN)
- is_group (BOOLEAN)
- created_at (TIMESTAMP)
```

### message_recipients table
```sql
- id (INT, PK)
- message_id (INT, FK)
- user_id (INT, FK)
- is_read (BOOLEAN)
- read_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

## Next Steps

1. ✅ Run migration script
2. ✅ Restart backend server
3. ✅ Test all three send modes
4. ✅ Verify notifications are created
5. ✅ Monitor error logs for issues
6. ✅ Deploy to production

## Support

For issues or questions:
1. Check error messages in browser console
2. Review server logs for backend errors
3. Verify database migration completed
4. Check user permissions and roles
