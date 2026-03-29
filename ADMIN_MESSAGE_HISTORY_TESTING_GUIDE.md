# Admin Message History & Reply Routing - Testing Guide

## Overview
This guide tests the complete admin message history system with proper reply routing to ensure messages reach the correct recipients.

## System Components

### Backend Endpoints (server/routes/messages.js)
1. **GET /api/messages/admin/history/:userId** - Get all sent/received messages and replies
2. **GET /api/messages/admin/conversations/:userId** - Get all unique conversations with unread counts
3. **GET /api/messages/admin/conversation/:userId/:otherUserId** - Get full thread between two users
4. **POST /api/messages/:messageId/reply** - Send reply to a message (routes to original sender)

### Frontend Components
1. **AdminMessagesView.js** - Main admin message management component with 3 tabs:
   - Conversations Tab: Shows all conversations with unread counts
   - History Tab: Shows all sent/received messages
   - Thread Tab: Shows full conversation thread with nested replies

### Integration Points
1. **PropertyAdminDashboard.js** - Added "📧 Message History" button
2. **SystemAdminDashboard.js** - Added "📧 Message History" button

---

## Test Scenarios

### Test 1: Admin Sends Message to User
**Objective**: Verify admin can send message and it appears in user's inbox

**Steps**:
1. Login as System Admin or Property Admin
2. Navigate to Messages section
3. Send message to a regular user (e.g., "Test message from admin")
4. Logout and login as the regular user
5. Check Messages - should see the admin's message

**Expected Result**: ✅ Message appears in user's inbox with admin's name and role

---

### Test 2: User Replies to Admin Message
**Objective**: Verify reply is sent to the correct admin (original sender)

**Steps**:
1. Login as regular user
2. Open the admin's message from Test 1
3. Click "Reply" button
4. Send reply (e.g., "Thanks for the message")
5. Logout and login as the admin
6. Click "📧 Message History" button
7. Go to "Conversations" tab

**Expected Result**: ✅ 
- Reply appears in admin's conversation list
- Unread count shows 1 new message
- Reply is correctly attributed to the user

---

### Test 3: Admin Views Conversation Thread
**Objective**: Verify admin can see full conversation thread with nested replies

**Steps**:
1. Login as admin
2. Click "📧 Message History" button
3. Go to "Conversations" tab
4. Click on the user's conversation from Test 2
5. View should switch to "Thread" tab

**Expected Result**: ✅
- Original message from admin appears first
- User's reply appears nested below with proper indentation
- Both messages show sender name, role, and timestamp
- Reply count badge shows "1 replies"

---

### Test 4: Admin Replies to User's Reply
**Objective**: Verify admin can reply to user's reply and it routes correctly

**Steps**:
1. In the Thread view from Test 3
2. Click "↩️ Reply" button on the user's message
3. Enter subject (should auto-populate as "Re: [original subject]")
4. Type reply message
5. Click "Send Reply"
6. Logout and login as the user

**Expected Result**: ✅
- Admin's reply appears in user's inbox
- User can see the full conversation thread
- Reply is correctly attributed to admin

---

### Test 5: Message History Tab
**Objective**: Verify all sent/received messages display correctly

**Steps**:
1. Login as admin
2. Click "📧 Message History" button
3. Go to "History" tab

**Expected Result**: ✅
- Shows statistics: Total Messages, Sent, Received
- Lists all messages with direction indicators (📤 Sent / 📥 Received)
- Shows recipient/sender name and role
- Shows reply count for each message
- Messages sorted by date (newest first)

---

### Test 6: Unread Count Tracking
**Objective**: Verify unread counts update correctly

**Steps**:
1. Login as admin
2. Click "📧 Message History" button
3. Go to "Conversations" tab
4. Note unread count for a user
5. Click on that conversation to view thread
6. Go back to Conversations tab

**Expected Result**: ✅
- Unread count decreases after viewing
- Badge shows "🔔 X unread" only when count > 0
- Unread count updates in real-time

---

### Test 7: Multiple Conversations
**Objective**: Verify admin can manage multiple conversations

**Steps**:
1. Login as admin
2. Send messages to 3 different users
3. Have each user reply
4. Click "📧 Message History" button
5. Go to "Conversations" tab

**Expected Result**: ✅
- All 3 conversations appear in list
- Each shows correct user name, role, email
- Message count is accurate
- Last message time is correct
- Can click each to view thread

---

### Test 8: Reply Form Validation
**Objective**: Verify reply form validates input correctly

**Steps**:
1. Login as admin
2. Open a conversation thread
3. Click "↩️ Reply" on a message
4. Try to send without subject
5. Try to send without message
6. Try to send with both fields filled

**Expected Result**: ✅
- Alert shows "Please enter both subject and message" when fields empty
- Reply sends successfully when both fields filled
- Subject auto-populates with "Re: [original subject]"

---

### Test 9: Admin-to-Admin Communication
**Objective**: Verify admins can communicate with each other

**Steps**:
1. Login as System Admin
2. Send message to Property Admin
3. Property Admin replies
4. System Admin views conversation

**Expected Result**: ✅
- Both admins can see each other's messages
- Replies route correctly between admins
- Thread displays properly

---

### Test 10: Message Deletion
**Objective**: Verify message deletion works correctly

**Steps**:
1. Login as admin
2. Open a message in History tab
3. Delete the message (if delete button available)
4. Verify it's removed from history

**Expected Result**: ✅
- Message is removed from history
- Conversation count updates
- No orphaned replies remain

---

## Performance Tests

### Test 11: Large Conversation Thread
**Objective**: Verify system handles many messages efficiently

**Steps**:
1. Create conversation with 50+ messages
2. Open thread view
3. Scroll through messages
4. Check load time

**Expected Result**: ✅
- Thread loads within 2 seconds
- Scrolling is smooth
- All messages display correctly

---

### Test 12: Many Conversations
**Objective**: Verify system handles many conversations

**Steps**:
1. Create 20+ conversations
2. Open Conversations tab
3. Scroll through list

**Expected Result**: ✅
- List loads within 2 seconds
- All conversations visible
- Scrolling is smooth

---

## Edge Cases

### Test 13: Reply to Deleted Message
**Objective**: Verify system handles reply to deleted message

**Steps**:
1. Admin sends message
2. User replies
3. Admin deletes original message
4. Check if reply still exists

**Expected Result**: ✅
- Reply still exists (orphaned but preserved)
- No errors in console

---

### Test 14: Inactive User Message
**Objective**: Verify system handles messages to inactive users

**Steps**:
1. Deactivate a user
2. Try to send message to that user
3. Check error handling

**Expected Result**: ✅
- Error message: "Cannot send message to inactive user"
- Message not sent

---

### Test 15: Self-Reply Prevention
**Objective**: Verify admin cannot reply to own message

**Steps**:
1. Admin sends message to user
2. User replies
3. Admin views thread
4. Check if "Reply" button appears on admin's own message

**Expected Result**: ✅
- "Reply" button only appears on messages from other users
- Cannot reply to own messages

---

## Browser Compatibility

Test on:
- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)

---

## Checklist

- [ ] All 15 test scenarios pass
- [ ] No console errors
- [ ] No database errors
- [ ] Reply routing works correctly
- [ ] Unread counts accurate
- [ ] Thread display correct
- [ ] Performance acceptable
- [ ] Edge cases handled
- [ ] UI responsive on mobile

---

## Quick Test Commands

```bash
# Test admin history endpoint
curl http://localhost:5000/api/messages/admin/history/1

# Test admin conversations endpoint
curl http://localhost:5000/api/messages/admin/conversations/1

# Test admin conversation thread endpoint
curl http://localhost:5000/api/messages/admin/conversation/1/2

# Send a reply
curl -X POST http://localhost:5000/api/messages/1/reply \
  -H "Content-Type: application/json" \
  -d '{"subject":"Re: Test","message":"Reply message","sender_id":2}'
```

---

## Troubleshooting

### Issue: Replies not appearing
- Check database: `SELECT * FROM messages WHERE parent_id IS NOT NULL;`
- Verify receiver_id is set correctly
- Check notifications table for errors

### Issue: Unread count not updating
- Clear browser cache
- Check message_recipients table
- Verify is_read flag updates

### Issue: Thread not loading
- Check browser console for errors
- Verify messageId is valid
- Check database connection

### Issue: Reply button not showing
- Verify message is from different user
- Check sender_id vs current user id
- Verify message exists in database

---

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Replies route to correct recipients
✅ Message history displays all messages
✅ Conversations show correct unread counts
✅ Thread view shows nested replies
✅ Performance is acceptable
✅ UI is responsive
✅ Edge cases handled gracefully
