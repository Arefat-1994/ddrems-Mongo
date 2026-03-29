# Deployment Guide - PHASE 1 & 2

## Pre-Deployment Checklist

- [ ] Backup database
- [ ] Stop backend server
- [ ] Review changes
- [ ] Test in development

---

## Deployment Steps

### Step 1: Apply Database Schema

```bash
# Run the schema update script
node apply-phase-1-2-schema.js
```

**Expected Output:**
```
[PHASE 1 & 2] Applying schema changes...
✅ Connected to database
[STEP 1] Creating message_replies table...
✅ message_replies table created
[STEP 2] Updating messages table...
✅ messages table updated
[STEP 3] Adding foreign key constraint...
✅ Foreign key added
[STEP 4] Creating indexes...
✅ Indexes created
[STEP 5] Verifying table structures...
✅ PHASE 1 & 2 SCHEMA SETUP COMPLETE!
```

### Step 2: Restart Backend Server

```bash
# Stop current server (Ctrl+C)
# Then restart
npm run server
```

**Expected Output:**
```
[SERVER] Server running on port 5000
[SERVER] Database connected
```

### Step 3: Test in Browser

#### Test Reply Functionality
1. Open browser and go to dashboard
2. Navigate to Messages
3. Click on any message
4. Click the "↩️" (Reply) button
5. Enter subject and message
6. Click "Send Reply"
7. Verify success message appears
8. Click "💬 (1)" button to view thread
9. Verify thread displays with both messages

#### Test Sidebar Navigation
1. Click "📧 Messages" in sidebar
2. Verify Messages page loads
3. Check unread count badge
4. Verify all messages display

#### Test on All Dashboards
1. Login as System Admin
2. Verify messages work
3. Logout and login as Property Admin
4. Verify messages work
5. Logout and login as Owner
6. Verify messages work
7. Logout and login as Customer
8. Verify messages work
9. Logout and login as Broker
10. Verify messages work

---

## Verification Commands

### Verify Database Schema

```bash
# Connect to MySQL
mysql -u root -p ddrems

# Check message_replies table
DESCRIBE message_replies;

# Check messages table updates
DESCRIBE messages;

# Check data
SELECT COUNT(*) FROM message_replies;
SELECT COUNT(*) FROM messages WHERE parent_id IS NOT NULL;
```

### Verify Backend Endpoints

```bash
# Test reply endpoint (replace IDs with actual values)
curl -X POST http://localhost:5000/api/messages/1/reply \
  -H "Content-Type: application/json" \
  -d '{"subject":"Test Reply","message":"This is a test"}' \
  -G --data-urlencode "userId=1"

# Test thread endpoint
curl http://localhost:5000/api/messages/1/thread?userId=1

# Test replies endpoint
curl http://localhost:5000/api/messages/1/replies?userId=1
```

---

## Rollback Instructions

If you need to rollback:

```bash
# Stop backend server
# Restore database from backup
# Restart backend server
```

**Rollback SQL (if needed):**
```sql
-- Drop new tables
DROP TABLE IF EXISTS message_replies;

-- Remove new columns from messages
ALTER TABLE messages 
DROP COLUMN IF EXISTS parent_id,
DROP COLUMN IF EXISTS reply_count;

-- Remove new indexes
ALTER TABLE messages 
DROP INDEX IF EXISTS idx_parent_id,
DROP INDEX IF EXISTS idx_reply_count;
```

---

## Troubleshooting

### Issue: "Table already exists" error
**Solution**: This is normal if running script twice. The script uses `CREATE TABLE IF NOT EXISTS`.

### Issue: Reply button not appearing
**Solution**: 
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors
4. Verify backend is running

### Issue: Reply not sending
**Solution**:
1. Check browser console for errors
2. Check server logs for errors
3. Verify user ID is correct
4. Verify message ID is correct

### Issue: Thread modal not opening
**Solution**:
1. Verify message has replies (reply_count > 0)
2. Check browser console for errors
3. Verify fetchMessageThread function is called
4. Check network tab for API response

### Issue: Sidebar messages link not working
**Solution**:
1. Verify sidebar component is loaded
2. Check browser console for errors
3. Verify Messages component exists
4. Clear cache and refresh

---

## Performance Monitoring

### Monitor Database Performance

```sql
-- Check query performance
EXPLAIN SELECT * FROM messages WHERE parent_id IS NOT NULL;

-- Check index usage
SHOW INDEX FROM messages;
SHOW INDEX FROM message_replies;

-- Check table size
SELECT 
  TABLE_NAME,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'ddrems'
AND TABLE_NAME IN ('messages', 'message_replies');
```

### Monitor Backend Performance

```bash
# Check response times in server logs
# Look for slow queries
# Monitor memory usage
```

---

## Post-Deployment Checklist

- [ ] Database schema applied successfully
- [ ] Backend server restarted
- [ ] Reply functionality tested
- [ ] Thread viewing tested
- [ ] Sidebar navigation tested
- [ ] All dashboard types tested
- [ ] No errors in browser console
- [ ] No errors in server logs
- [ ] Performance acceptable
- [ ] Users notified of new features

---

## User Communication

### Email Template

```
Subject: New Message Reply Feature Available

Dear Users,

We're excited to announce a new feature in the messaging system:

📤 MESSAGE REPLIES
You can now reply directly to messages! Simply:
1. Open a message
2. Click the Reply button (↩️)
3. Type your response
4. Send

💬 VIEW THREADS
Click the thread button to see the full conversation history.

This feature is available to all users across all dashboards.

For support, please contact the admin team.

Best regards,
DDREMS Team
```

---

## Monitoring After Deployment

### Daily Checks
- [ ] No error messages in logs
- [ ] Reply functionality working
- [ ] Thread viewing working
- [ ] Notifications being created
- [ ] Performance acceptable

### Weekly Checks
- [ ] Database size reasonable
- [ ] Query performance good
- [ ] No memory leaks
- [ ] User feedback positive

---

## Success Criteria

✅ **Deployment is successful when:**
- Database schema applied without errors
- Backend server running normally
- Reply button visible and functional
- Replies send successfully
- Thread modal displays correctly
- Sidebar navigation works
- All dashboard types functional
- No errors in logs
- Performance acceptable
- Users can use new features

---

## Next Steps After Deployment

1. **Monitor for 24 hours**
   - Check logs regularly
   - Monitor performance
   - Gather user feedback

2. **Prepare PHASE 3**
   - Review AI integration requirements
   - Prepare components
   - Plan implementation

3. **Schedule PHASE 3 Deployment**
   - Plan timeline
   - Prepare documentation
   - Notify users

---

## Support Contact

For deployment issues:
1. Check this guide
2. Review error logs
3. Check browser console
4. Contact development team

---

## Deployment Complete ✅

Once all steps are completed and verified, PHASE 1 & 2 deployment is complete and ready for production use.

