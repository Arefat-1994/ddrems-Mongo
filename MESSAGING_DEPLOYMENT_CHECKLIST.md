# Messaging System - Deployment Checklist

## Pre-Deployment

### Code Review
- [ ] Review `server/routes/messages.js` for security issues
- [ ] Review `client/src/components/SendMessage.js` for UI/UX issues
- [ ] Check all error messages are user-friendly
- [ ] Verify all input validation is in place
- [ ] Confirm authentication middleware is applied to all routes

### Database Preparation
- [ ] Backup current database
  ```bash
  mysqldump -u root -p ddrems > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Review migration script: `database/migrate-messaging-system.sql`
- [ ] Test migration on staging database first
- [ ] Verify no data loss in migration

### Environment Setup
- [ ] Verify Node.js version (v14+)
- [ ] Verify MySQL version (5.7+)
- [ ] Check all dependencies are installed
- [ ] Verify environment variables are set

## Deployment Steps

### Step 1: Database Migration
- [ ] Stop backend server
- [ ] Run migration script
  ```bash
  node run-messaging-migration.js
  ```
- [ ] Verify migration completed successfully
- [ ] Check new tables and columns exist
  ```sql
  SHOW COLUMNS FROM messages;
  SHOW TABLES LIKE 'message_recipients';
  ```

### Step 2: Backend Deployment
- [ ] Deploy updated `server/routes/messages.js`
- [ ] Deploy updated `database/unified-schema.sql`
- [ ] Restart backend server
  ```bash
  npm start
  ```
- [ ] Verify server starts without errors
- [ ] Check server logs for any warnings

### Step 3: Frontend Deployment
- [ ] Deploy updated `client/src/components/SendMessage.js`
- [ ] Deploy updated `client/src/components/SendMessage.css`
- [ ] Rebuild frontend
  ```bash
  npm run build
  ```
- [ ] Verify build completes without errors
- [ ] Deploy to production

### Step 4: Verification
- [ ] Access application in browser
- [ ] Verify no console errors
- [ ] Check network requests are successful
- [ ] Verify database connections work

## Testing

### Unit Tests
- [ ] Test single message sending
- [ ] Test group message sending
- [ ] Test bulk message sending (admin only)
- [ ] Test message retrieval
- [ ] Test unread count
- [ ] Test mark as read
- [ ] Test message deletion

### Integration Tests
- [ ] Test end-to-end single message flow
- [ ] Test end-to-end group message flow
- [ ] Test end-to-end bulk message flow
- [ ] Test notification creation
- [ ] Test permission enforcement

### User Acceptance Tests
- [ ] System Admin can send all message types
- [ ] Property Admin can send all message types
- [ ] Broker can send single and group messages
- [ ] Owner can send single and group messages
- [ ] Customer can send single and group messages
- [ ] Non-admin cannot send bulk messages
- [ ] Users cannot send to themselves
- [ ] Users cannot send to non-existent recipients

### Error Scenario Tests
- [ ] Missing required fields shows error
- [ ] Invalid recipient shows error
- [ ] Unauthorized user shows error
- [ ] Server error shows user-friendly message
- [ ] Network error is handled gracefully

### Performance Tests
- [ ] Single message sends in < 1 second
- [ ] Group message (10 users) sends in < 2 seconds
- [ ] Bulk message (100 users) sends in < 5 seconds
- [ ] Message retrieval is fast (< 500ms)
- [ ] No database connection leaks

### Security Tests
- [ ] Authentication is required
- [ ] Authorization is enforced
- [ ] SQL injection is prevented
- [ ] XSS attacks are prevented
- [ ] CSRF protection is in place
- [ ] Rate limiting is working (if implemented)

## Post-Deployment

### Monitoring
- [ ] Monitor server logs for errors
- [ ] Monitor database performance
- [ ] Monitor API response times
- [ ] Monitor error rates
- [ ] Monitor user feedback

### Documentation
- [ ] Update user documentation
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Update troubleshooting guide
- [ ] Create runbook for common issues

### Rollback Plan
- [ ] Document rollback procedure
- [ ] Test rollback on staging
- [ ] Keep backup database accessible
- [ ] Document rollback timeline
- [ ] Identify rollback decision criteria

## Rollback Procedure (If Needed)

### Step 1: Stop Services
```bash
npm stop
```

### Step 2: Restore Database
```bash
mysql -u root -p ddrems < backup_YYYYMMDD_HHMMSS.sql
```

### Step 3: Revert Code
```bash
git checkout server/routes/messages.js
git checkout client/src/components/SendMessage.js
git checkout client/src/components/SendMessage.css
```

### Step 4: Restart Services
```bash
npm start
```

### Step 5: Verify
- [ ] Application loads without errors
- [ ] Old messaging system works
- [ ] No data loss
- [ ] Users can access their messages

## Sign-Off

### Development Team
- [ ] Code review completed
- [ ] All tests passed
- [ ] Documentation updated
- [ ] Ready for deployment

**Signed by:** _________________ **Date:** _________

### QA Team
- [ ] All test cases passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security verified

**Signed by:** _________________ **Date:** _________

### Operations Team
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Backup verified
- [ ] Rollback plan ready

**Signed by:** _________________ **Date:** _________

### Product Owner
- [ ] Requirements met
- [ ] User experience acceptable
- [ ] Ready for production

**Signed by:** _________________ **Date:** _________

## Post-Deployment Monitoring (24 Hours)

### Hour 1
- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify database performance
- [ ] Monitor user feedback

### Hour 2-4
- [ ] Continue monitoring
- [ ] Check for any issues
- [ ] Verify all features working
- [ ] Monitor resource usage

### Hour 4-24
- [ ] Daily monitoring
- [ ] Check error trends
- [ ] Verify performance metrics
- [ ] Collect user feedback

## Success Criteria

- [ ] Zero critical errors in logs
- [ ] API response time < 1 second
- [ ] Database queries < 500ms
- [ ] 99.9% uptime
- [ ] All features working as expected
- [ ] No user complaints
- [ ] Performance metrics acceptable

## Issues Found & Resolution

| Issue | Severity | Status | Resolution |
|-------|----------|--------|-----------|
|       |          |        |           |
|       |          |        |           |
|       |          |        |           |

## Lessons Learned

1. 
2. 
3. 

## Next Steps

- [ ] Monitor system for 1 week
- [ ] Collect user feedback
- [ ] Plan for enhancements
- [ ] Schedule next review

## Contact Information

**On-Call Support:** _________________ **Phone:** _________

**Database Admin:** _________________ **Phone:** _________

**Backend Lead:** _________________ **Phone:** _________

**Frontend Lead:** _________________ **Phone:** _________

---

**Deployment Date:** _________

**Deployed By:** _________________

**Approved By:** _________________

**Notes:**
